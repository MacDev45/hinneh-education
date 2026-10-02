# create_deploy_zip.ps1
# Script to package the production files for HINNEH ÉDUCATION

$ErrorActionPreference = 'Stop'
$deployDir = "deploy_prod"
$zipPath = "HINNEH_EDUCATION_deploy.zip"

Write-Host "========================================"
Write-Host " Preparing Hinneh Education Production Zip"
Write-Host "========================================"

# 1. Clean old deployment files
if (Test-Path $deployDir) {
    Write-Host "Removing existing temporary deployment folder..."
    Remove-Item -Recurse -Force $deployDir
}
if (Test-Path $zipPath) {
    Write-Host "Removing old zip file..."
    Remove-Item -Force $zipPath
}

# 2. Ensure frontend is compiled (skip if dist already exists to avoid OOM)
if (-not (Test-Path "dist")) {
    Write-Host "No 'dist' folder found. Building frontend..."
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    npm run build
} else {
    Write-Host "Using existing built frontend assets from 'dist' directory to avoid Node.js memory issues."
}



# 3. Create clean deploy directory structure
Write-Host "Creating clean directories..."
New-Item -ItemType Directory -Path $deployDir | Out-Null
New-Item -ItemType Directory -Path "$deployDir/backend" | Out-Null

# 4. Copy Frontend compiled assets (from dist/)
Write-Host "Copying frontend assets (dist)..."
Copy-Item -Path "dist/*" -Destination $deployDir -Recurse -Force

# 4.5 Create .htaccess for Apache deployment
Write-Host "Creating .htaccess file for cPanel compatibility..."
$htaccessContent = @"
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Let cPanel's Phusion Passenger handle all /api requests
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule .* - [L]

  # SPA Routing: redirect non-existent files/directories to index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
"@

Set-Content -Path "$deployDir/.htaccess" -Value $htaccessContent

# 4.7 Copy passenger_wsgi.py to root for Phusion Passenger compatibility
if (Test-Path "passenger_wsgi.py") {
    Write-Host "Copying passenger_wsgi.py to deploy root..."
    Copy-Item -Path "passenger_wsgi.py" -Destination $deployDir -Force
}

# 5. Copy Backend files
Write-Host "Copying backend files..."
Copy-Item -Path "api/*" -Destination "$deployDir/backend" -Recurse -Force

# 6. Clean up unnecessary files in the backend folder to reduce size
Write-Host "Cleaning up backend cache and local SQLite databases..."
$cleanPaths = @(
    "$deployDir/backend/__pycache__",
    "$deployDir/backend/app/__pycache__",
    "$deployDir/backend/app/routers/__pycache__",
    "$deployDir/backend/.pytest_cache",
    "$deployDir/backend/venv",
    "$deployDir/backend/school_educ.db"
)

foreach ($path in $cleanPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

# 7. Compress into production ZIP archive
Write-Host "Creating production ZIP archive..."
Compress-Archive -Path "$deployDir/*" -DestinationPath $zipPath -Force

# 8. Clean up temporary directory
Write-Host "Cleaning up temporary files..."
Remove-Item -Recurse -Force $deployDir

Write-Host "========================================"
Write-Host "SUCCESS: Production ZIP file created at:"
Write-Host " -> $zipPath"
Write-Host "========================================"
