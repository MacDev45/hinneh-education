#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de packaging pour le deploiement de HINNEH EDUCATION.
Usage: python package_deploy.py
"""
import sys, shutil
from pathlib import Path

ROOT            = Path(__file__).parent.resolve()
DIST_DIR        = ROOT / "dist"
DEPLOY_DIR      = ROOT / "deploy"
FRONTEND_DEPLOY = DEPLOY_DIR / "frontend"
BACKEND_DEPLOY  = DEPLOY_DIR / "backend"
API_DIR         = ROOT / "api"

def ok(msg):  print(f"  [OK]   {msg}")
def warn(msg): print(f"  [WARN] {msg}")
def err(msg):  print(f"  [ERR]  {msg}"); sys.exit(1)
def step(msg): print(f"\n{'='*55}\n  {msg}\n{'='*55}")

# ---------------------------------------------------------------------------
# 0. Verifications prealables
# ---------------------------------------------------------------------------
step("0. Verification du build frontend")
if not DIST_DIR.exists() or not any(DIST_DIR.iterdir()):
    err("dist/ introuvable ou vide. Lancez d'abord: npm run build")
ok(f"dist/ trouve ({sum(1 for _ in DIST_DIR.rglob('*'))} fichiers)")

# ---------------------------------------------------------------------------
# 1. Creer l'arborescence de deploiement
# ---------------------------------------------------------------------------
step("1. Creation de deploy/")
if DEPLOY_DIR.exists():
    shutil.rmtree(DEPLOY_DIR)
FRONTEND_DEPLOY.mkdir(parents=True)
BACKEND_DEPLOY.mkdir(parents=True)
ok("deploy/frontend/ et deploy/backend/ crees")

# ---------------------------------------------------------------------------
# 2. Copier le frontend
# ---------------------------------------------------------------------------
step("2. Copie du frontend (dist/ -> deploy/frontend/)")
shutil.copytree(DIST_DIR, FRONTEND_DEPLOY, dirs_exist_ok=True)
ok("Frontend copie")

# Ecrire le .htaccess
HTACCESS = (
    "Options -MultiViews\n"
    "RewriteEngine On\n\n"
    "# Forcer HTTPS\n"
    "RewriteCond %{HTTPS} off\n"
    "RewriteCond %{HTTP_HOST} !^localhost\n"
    "RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]\n\n"
    "# Proxy /api -> Uvicorn sur port 8010\n"
    "RewriteCond %{REQUEST_URI} ^/api/\n"
    "RewriteRule ^api/(.*)$ http://127.0.0.1:8010/api/$1 [P,L]\n\n"
    "# Proxy /docs et /redoc\n"
    "RewriteCond %{REQUEST_URI} ^/(docs|redoc|openapi.json)\n"
    "RewriteRule ^(.*)$ http://127.0.0.1:8010/$1 [P,L]\n\n"
    "# SPA fallback\n"
    "RewriteCond %{REQUEST_FILENAME} !-f\n"
    "RewriteCond %{REQUEST_FILENAME} !-d\n"
    "RewriteRule ^ index.html [L]\n\n"
    "<IfModule mod_expires.c>\n"
    "  ExpiresActive On\n"
    "  ExpiresByType text/html                 \"access plus 0 seconds\"\n"
    "  ExpiresByType text/css                  \"access plus 1 year\"\n"
    "  ExpiresByType application/javascript    \"access plus 1 year\"\n"
    "  ExpiresByType image/svg+xml             \"access plus 1 year\"\n"
    "  ExpiresByType image/png                 \"access plus 1 year\"\n"
    "  ExpiresByType image/jpeg                \"access plus 1 year\"\n"
    "  ExpiresByType image/x-icon              \"access plus 1 year\"\n"
    "  ExpiresByType font/woff2                \"access plus 1 year\"\n"
    "</IfModule>\n\n"
    "<IfModule mod_deflate.c>\n"
    "  AddOutputFilterByType DEFLATE text/html text/plain text/css\n"
    "  AddOutputFilterByType DEFLATE application/javascript application/json\n"
    "  AddOutputFilterByType DEFLATE image/svg+xml font/woff2\n"
    "</IfModule>\n\n"
    "<IfModule mod_headers.c>\n"
    "  Header set X-Content-Type-Options \"nosniff\"\n"
    "  Header set X-Frame-Options \"SAMEORIGIN\"\n"
    "  Header set X-XSS-Protection \"1; mode=block\"\n"
    "  Header set Referrer-Policy \"strict-origin-when-cross-origin\"\n"
    "</IfModule>\n"
)
(FRONTEND_DEPLOY / ".htaccess").write_text(HTACCESS, encoding="utf-8")
ok(".htaccess produit ecrit dans deploy/frontend/")

# ---------------------------------------------------------------------------
# 3. Copier le backend
# ---------------------------------------------------------------------------
step("3. Copie du backend FastAPI")
BACKEND_ITEMS = ["app", "passenger_wsgi.py", "requirements.txt", ".env", ".env.production"]
for item in BACKEND_ITEMS:
    src = API_DIR / item
    dst = BACKEND_DEPLOY / item
    if src.is_dir():
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.db"))
        ok(f"Dossier: {item}/")
    elif src.is_file():
        shutil.copy2(src, dst)
        ok(f"Fichier: {item}")
    else:
        warn(f"Non trouve (ignore): {item}")

# Creer les dossiers uploads/ necessaires
for sub in ["photos", "school_assets/logos", "school_assets/signatures", "school_assets/cachets"]:
    d = BACKEND_DEPLOY / "uploads" / sub
    d.mkdir(parents=True, exist_ok=True)
    (d / ".gitkeep").touch()
ok("Dossiers uploads/ crees")

# Nettoyer __pycache__
for pc in BACKEND_DEPLOY.rglob("__pycache__"):
    shutil.rmtree(pc)
for pyc in BACKEND_DEPLOY.rglob("*.pyc"):
    pyc.unlink()
ok("__pycache__ nettoyes")

# ---------------------------------------------------------------------------
# 4. Creer les archives ZIP
# ---------------------------------------------------------------------------
step("4. Creation des archives ZIP")
for zf in [ROOT / "deploy_frontend.zip", ROOT / "deploy_backend.zip"]:
    if zf.exists():
        zf.unlink()

shutil.make_archive(str(ROOT / "deploy_frontend"), "zip", FRONTEND_DEPLOY)
size_f = (ROOT / "deploy_frontend.zip").stat().st_size // 1024
ok(f"deploy_frontend.zip ({size_f} KB)")

shutil.make_archive(str(ROOT / "deploy_backend"), "zip", BACKEND_DEPLOY)
size_b = (ROOT / "deploy_backend.zip").stat().st_size // 1024
ok(f"deploy_backend.zip ({size_b} KB)")

# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------
print("\n" + "="*55)
print("  DEPLOIEMENT PRET !")
print("="*55)
print("  [ZIP] deploy_frontend.zip -> upload dans public_html/")
print("  [ZIP] deploy_backend.zip  -> upload dans Python App cPanel")
print()
print("  ETAPES CPANEL:")
print("  1. Extraire deploy_frontend.zip dans public_html/")
print("  2. Creer Python App (Python 3.11, startup: passenger_wsgi.py)")
print("  3. Extraire deploy_backend.zip dans le dossier Python App")
print("  4. pip install -r requirements.txt")
print("  5. Editer .env.production avec vos credentials MySQL")
print("  6. Redemarrer la Python App")
print("  7. Tester: https://www.hinneh-education.ci/api/health")
print()
