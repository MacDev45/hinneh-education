# ============================================================
#  HINNEH ÉDUCATION — Script de Packaging Déploiement
#  Génère : deploy/frontend/ (SPA) + deploy/backend/ (API)
#  Usage : powershell -ExecutionPolicy Bypass -File package_deploy.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT    = $PSScriptRoot
$DIST    = Join-Path $ROOT "dist"
$DEPLOY  = Join-Path $ROOT "deploy"
$FRONT   = Join-Path $DEPLOY "frontend"
$BACK    = Join-Path $DEPLOY "backend"
$API_SRC = Join-Path $ROOT "api"
$DATE    = Get-Date -Format "yyyyMMdd_HHmm"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   HINNEH ÉDUCATION — Build & Package de Déploiement ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── ÉTAPE 1 : Build frontend ──────────────────────────────────
Write-Host "▶  [1/5] Build du frontend React (Vite)..." -ForegroundColor Yellow
Set-Location $ROOT
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗  Erreur lors du build frontend. Arrêt." -ForegroundColor Red
    exit 1
}
Write-Host "✓  Build frontend terminé." -ForegroundColor Green

# ── ÉTAPE 2 : Copier le build dans deploy/frontend ───────────
Write-Host "▶  [2/5] Copie du build dans deploy/frontend/..." -ForegroundColor Yellow
if (Test-Path $FRONT) { Remove-Item -Recurse -Force $FRONT }
New-Item -ItemType Directory -Path $FRONT | Out-Null

Copy-Item -Recurse -Force "$DIST\*" $FRONT

# Copier la page d'erreur personnalisée
$errorPage = Join-Path $ROOT "public\error.html"
if (Test-Path $errorPage) {
    Copy-Item -Force $errorPage $FRONT
    Write-Host "  ✓ error.html copié"
}

# Créer/mettre à jour le .htaccess
$htaccess = Join-Path $DEPLOY "frontend\.htaccess"
if (Test-Path $htaccess) {
    Copy-Item -Force $htaccess $FRONT
    Write-Host "  ✓ .htaccess copié"
}

Write-Host "✓  Frontend prêt dans deploy/frontend/" -ForegroundColor Green

# ── ÉTAPE 3 : Préparer le backend ────────────────────────────
Write-Host "▶  [3/5] Préparation du backend Python..." -ForegroundColor Yellow
if (Test-Path $BACK) { Remove-Item -Recurse -Force $BACK }
New-Item -ItemType Directory -Path $BACK | Out-Null

# Dossiers et fichiers à copier (exclusion des caches et scripts de debug)
$excludeDirs  = @("__pycache__", ".git", "venv", ".venv", "env", "uploads", "school_educ.db")
$excludeFiles = @("*.pyc", "*.pyo", "debug_*.py", "check_*.py", "inspect_*.py",
                  "test_*.py", "ping_*.py", "seed_db.py", "scratch_*.py",
                  "read_transcript.py", "print_inserts*.py", "reset_passwords*.py",
                  "create_admin.py", "create_user.py", "setup_users.py",
                  "uvicorn_err.log", "server_log.txt", "server_output.log", "uv_log.txt",
                  "*.db", "*.sql", "*.xlsx", "*.txt", "*.zip")

Get-ChildItem -Path $API_SRC | Where-Object {
    $_.Name -notin $excludeDirs -and
    -not ($excludeFiles | Where-Object { $_ -like "*$($_.Extension)" } | Select-Object -First 1)
} | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($_.Name -notin $excludeDirs) {
            Copy-Item -Recurse -Force $_.FullName $BACK
        }
    } else {
        $skip = $false
        foreach ($pattern in $excludeFiles) {
            if ($_.Name -like $pattern) { $skip = $true; break }
        }
        if (-not $skip) {
            Copy-Item -Force $_.FullName $BACK
        }
    }
}

# Créer le dossier uploads vide (nécessaire au démarrage)
$uploadsBack = Join-Path $BACK "uploads"
New-Item -ItemType Directory -Path (Join-Path $uploadsBack "photos")         -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $uploadsBack "school_assets\logos")     -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $uploadsBack "school_assets\signatures") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $uploadsBack "school_assets\cachets")    -Force | Out-Null
Set-Content -Path (Join-Path $uploadsBack "photos\.gitkeep") ""

# Copier les fichiers .env de production
Copy-Item -Force (Join-Path $DEPLOY "backend\.env")            $BACK
Copy-Item -Force (Join-Path $DEPLOY "backend\.env.production") $BACK

Write-Host "✓  Backend prêt dans deploy/backend/" -ForegroundColor Green

# ── ÉTAPE 4 : Créer les archives ZIP ─────────────────────────
Write-Host "▶  [4/5] Création des archives ZIP..." -ForegroundColor Yellow

$zipFront   = Join-Path $DEPLOY "HINNEH_frontend_${DATE}.zip"
$zipBack    = Join-Path $DEPLOY "HINNEH_backend_${DATE}.zip"
$zipComplet = Join-Path $DEPLOY "HINNEH_COMPLET_${DATE}.zip"

# Supprimer les anciens ZIPs
Get-ChildItem $DEPLOY -Filter "HINNEH_*.zip" | Remove-Item -Force

Compress-Archive -Path "$FRONT\*"  -DestinationPath $zipFront   -Force
Compress-Archive -Path "$BACK\*"   -DestinationPath $zipBack    -Force

# ZIP complet (frontend + backend ensemble)
$tmpComplet = Join-Path $DEPLOY "_tmp_complet"
if (Test-Path $tmpComplet) { Remove-Item -Recurse -Force $tmpComplet }
New-Item -ItemType Directory -Path $tmpComplet | Out-Null
Copy-Item -Recurse -Force $FRONT (Join-Path $tmpComplet "frontend")
Copy-Item -Recurse -Force $BACK  (Join-Path $tmpComplet "backend")
Copy-Item -Force (Join-Path $ROOT "deploy\GUIDE_DEPLOIEMENT.md") $tmpComplet -ErrorAction SilentlyContinue
Compress-Archive -Path "$tmpComplet\*" -DestinationPath $zipComplet -Force
Remove-Item -Recurse -Force $tmpComplet

Write-Host "✓  Archives créées :" -ForegroundColor Green
Write-Host "     Frontend  : $zipFront"
Write-Host "     Backend   : $zipBack"
Write-Host "     Complet   : $zipComplet"

# ── ÉTAPE 5 : Résumé ─────────────────────────────────────────
Write-Host ""
Write-Host "▶  [5/5] Résumé du déploiement" -ForegroundColor Yellow
$frontSize = (Get-Item $zipFront).Length / 1MB
$backSize  = (Get-Item $zipBack).Length / 1MB
Write-Host ("  Frontend ZIP  : {0:N1} MB" -f $frontSize)
Write-Host ("  Backend ZIP   : {0:N1} MB" -f $backSize)
Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅  Package de déploiement prêt !" -ForegroundColor Green
Write-Host "  📁  Dossier : $DEPLOY" -ForegroundColor Green
Write-Host "  📖  Lisez GUIDE_DEPLOIEMENT.md avant de déployer." -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
