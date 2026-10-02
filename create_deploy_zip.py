# create_deploy_zip.py
# Python script to package production assets for HINNEH ÉDUCATION

import os
import shutil
import zipfile

deploy_dir = "deploy_prod"
zip_path = "HINNEH_EDUCATION_deploy.zip"

print("========================================")
print(" Preparing Hinneh Education Production Zip")
print("========================================")

# 1. Clean old deployment files
if os.path.exists(deploy_dir):
    print("Removing existing temporary deployment folder...")
    shutil.rmtree(deploy_dir, ignore_errors=True)

if os.path.exists(zip_path):
    print("Removing old zip file...")
    try:
        os.remove(zip_path)
    except Exception as e:
        print(f"Warning: Could not remove old zip (it might be locked): {e}")

# 2. Verify frontend 'dist' directory exists
if not os.path.exists("dist"):
    print("Error: 'dist' folder not found. Please run 'npm run build' first.")
    exit(1)
else:
    print("Using existing built frontend assets from 'dist' directory.")

# 3. Create deploy directories
print("Creating clean directories...")
os.makedirs(deploy_dir, exist_ok=True)
os.makedirs(os.path.join(deploy_dir, "backend"), exist_ok=True)

# 4. Copy Frontend assets
print("Copying frontend assets (dist)...")
for item in os.listdir("dist"):
    s = os.path.join("dist", item)
    d = os.path.join(deploy_dir, item)
    if os.path.isdir(s):
        shutil.copytree(s, d)
    else:
        shutil.copy2(s, d)

# 5. Create .htaccess for cPanel Compatibility
print("Creating .htaccess file for cPanel compatibility...")
htaccess_content = """<IfModule mod_rewrite.c>
  RewriteEngine On

  # Let cPanel's Phusion Passenger handle all /api requests
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule .* - [L]

  # SPA Routing: redirect non-existent files/directories to index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>
"""
with open(os.path.join(deploy_dir, ".htaccess"), "w", encoding="utf-8") as f:
    f.write(htaccess_content)

# 5.5 Copy passenger_wsgi.py to root for Phusion Passenger compatibility
if os.path.exists("passenger_wsgi.py"):
    print("Copying passenger_wsgi.py to deploy root...")
    shutil.copy2("passenger_wsgi.py", os.path.join(deploy_dir, "passenger_wsgi.py"))

# 6. Copy Backend files
print("Copying backend files...")
backend_src = "api"
backend_dest = os.path.join(deploy_dir, "backend")

ignore_patterns = shutil.ignore_patterns(
    "__pycache__",
    "*.pyc",
    "venv",
    ".pytest_cache",
    "school_educ.db",
    ".git"
)

# Walk and copy backend files manually to avoid conflicts
for item in os.listdir(backend_src):
    s = os.path.join(backend_src, item)
    d = os.path.join(backend_dest, item)
    
    # Skip ignored names
    if item in ["__pycache__", "venv", ".pytest_cache", "school_educ.db", ".git"]:
        continue
        
    if os.path.isdir(s):
        shutil.copytree(s, d, ignore=ignore_patterns)
    else:
        shutil.copy2(s, d)

# 7. Create ZIP archive
print("Creating production ZIP archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(deploy_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Calculate path relative to the deploy_dir
            arcname = os.path.relpath(file_path, deploy_dir)
            zipf.write(file_path, arcname)

# 8. Clean up temporary directory
print("Cleaning up temporary files...")
shutil.rmtree(deploy_dir, ignore_errors=True)

print("========================================")
print(f"SUCCESS: Production ZIP file created at:\n -> {zip_path}")
print("========================================")
