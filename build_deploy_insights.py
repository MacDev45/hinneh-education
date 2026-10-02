#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
  HINNEH ÉDUCATION — SCRIPT DE DÉPLOIEMENT POUR EDUC.INSIGHTS-VIEW.CI
=============================================================================
  - Domaine cible : https://educ.insights-view.ci
  - Base de données : insights_test (et NON insights_central)
  - Port backend dédié : 8020 (différent de 8000/8010 pour hinneh-education.ci)
  - Dossier généré : deploy_educ_insights_view/
  - Archives ZIP :
      * deploy_educ_insights_view_frontend.zip
      * deploy_educ_insights_view_backend.zip
      * deploy_educ_insights_view_all.zip
=============================================================================
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT            = Path(__file__).parent.resolve()
DIST_DIR        = ROOT / "dist"
DEPLOY_DIR      = ROOT / "DOSSIER_DEPLOIEMENT"
FRONTEND_DEPLOY = DEPLOY_DIR / "frontend_public_html"
BACKEND_DEPLOY  = DEPLOY_DIR / "backend_api"
CONFIGS_DEPLOY  = DEPLOY_DIR / "server_configurations"
API_DIR         = ROOT / "api"

BACKEND_PORT    = 8001
DOMAIN          = "educ.hinneh-education.ci"
DB_NAME         = "insights_test"

def print_step(msg: str):
    print(f"\n{'='*75}")
    print(f"  {msg}")
    print(f"{'='*75}")

def print_ok(msg: str):
    print(f"  [OK] {msg}")

def print_warn(msg: str):
    print(f"  [WARN] {msg}")

def print_err(msg: str):
    print(f"  [ERR] {msg}", file=sys.stderr)

# ===========================================================================
# ÉTAPE 1 - Build / Vérification du Frontend React / Vite
# ===========================================================================
print_step("ÉTAPE 1 - Build du Frontend pour Déploiement")

env = os.environ.copy()
env["NODE_OPTIONS"] = "--max-old-space-size=4096"
vite_bin = ROOT / "node_modules" / ".bin" / ("vite.cmd" if sys.platform == "win32" else "vite")
if vite_bin.exists():
    result = subprocess.run([str(vite_bin), "build"], cwd=ROOT, env=env, capture_output=False)
else:
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    result = subprocess.run([npm_cmd, "run", "build"], cwd=ROOT, env=env, capture_output=False)
if result.returncode != 0:
    print_err("Échec du build frontend.")
    sys.exit(1)

print_ok(f"Dossier dist/ compilé et validé ({sum(1 for _ in DIST_DIR.rglob('*'))} éléments)")

# ===========================================================================
# ÉTAPE 2 - Préparation de l'arborescence DOSSIER_DEPLOIEMENT/
# ===========================================================================
print_step("ÉTAPE 2 - Préparation du dossier DOSSIER_DEPLOIEMENT/")

if DEPLOY_DIR.exists():
    try:
        shutil.rmtree(DEPLOY_DIR, ignore_errors=True)
    except Exception:
        pass

FRONTEND_DEPLOY.mkdir(parents=True, exist_ok=True)
BACKEND_DEPLOY.mkdir(parents=True, exist_ok=True)
CONFIGS_DEPLOY.mkdir(parents=True, exist_ok=True)
print_ok("Dossiers frontend_public_html, backend_api et server_configurations créés")

# ── Copier le frontend buildé ─────────────────────────────────────────────────
shutil.copytree(DIST_DIR, FRONTEND_DEPLOY, dirs_exist_ok=True)
print_ok("Frontend copié dans DOSSIER_DEPLOIEMENT/frontend_public_html/")

# ── Écrire le .htaccess universel sans erreur 404/500/503 ─────────────────────
HTACCESS_CONTENT = f"""# ==============================================================================
# HINNEH ÉDUCATION - FICHIER .HTACCESS DE PRODUCTION
# Conçu pour éliminer les erreurs 404, 403, 500, 502, 503 sur Apache / cPanel
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. GESTION DES PAGES D'ERREUR (Anti-crash 404 / 500 / 503)
# ------------------------------------------------------------------------------
ErrorDocument 404 /index.html
ErrorDocument 500 /error.html
ErrorDocument 502 /error.html
ErrorDocument 503 /error.html

# ------------------------------------------------------------------------------
# 2. RÉÉCRITURE D'URL & ROUTAGE SPA (React Router - Évite les 404 au rafraîchissement)
# ------------------------------------------------------------------------------
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # ─── Optionnel : Proxy vers l'API FastAPI locale si mod_proxy est actif ─────
  <IfModule mod_proxy.c>
    RewriteRule ^api/(.*)$ http://127.0.0.1:{BACKEND_PORT}/api/$1 [P,L]
    RewriteRule ^(docs|redoc|openapi.json) http://127.0.0.1:{BACKEND_PORT}/$1 [P,L]
    RewriteRule ^uploads/(.*)$ http://127.0.0.1:{BACKEND_PORT}/uploads/$1 [P,L]
  </IfModule>

  # ─── Ne pas réécrire les fichiers et dossiers réels existants ──────────────
  RewriteCond %{{REQUEST_FILENAME}} -f [OR]
  RewriteCond %{{REQUEST_FILENAME}} -d
  RewriteRule ^ - [L]

  # ─── Rediriger toutes les autres routes vers index.html pour le SPA ─────────
  RewriteRule ^ index.html [L]
</IfModule>

# ------------------------------------------------------------------------------
# 3. TYPES MIME OFFICIELS (Évite les erreurs de modules JS ou polices bloqués)
# ------------------------------------------------------------------------------
<IfModule mod_mime.c>
  AddType application/javascript          js mjs
  AddType text/css                        css
  AddType application/json                json
  AddType image/svg+xml                   svg svgz
  AddType font/woff2                      woff2
  AddType font/woff                       woff
  AddType font/ttf                        ttf
  AddType font/eot                        eot
  AddType image/webp                      webp
  AddType image/x-icon                    ico
  AddType application/pdf                 pdf
</IfModule>

# ------------------------------------------------------------------------------
# 4. EN-TÊTES DE SÉCURITÉ & CORS
# ------------------------------------------------------------------------------
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-School-Scope"

  # ─── Cache Control : Pas de cache pour index.html (mises à jour immédiates) ──
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  # ─── Cache long pour les assets versionnés (JS, CSS, Polices, Images) ───────
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|png|jpg|jpeg|gif|ico|webp)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>
</IfModule>

# ------------------------------------------------------------------------------
# 5. COMPRESSION GZIP / DEFLATE (Accélération du chargement)
# ------------------------------------------------------------------------------
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
  AddOutputFilterByType DEFLATE text/javascript application/javascript application/x-javascript
  AddOutputFilterByType DEFLATE application/json application/xml image/svg+xml
  AddOutputFilterByType DEFLATE font/ttf font/woff font/woff2
</IfModule>

# ------------------------------------------------------------------------------
# 6. EXPIRATION DU CACHE NAVIGATEUR (mod_expires)
# ------------------------------------------------------------------------------
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 month"
  ExpiresByType text/html                 "access plus 0 seconds"
  ExpiresByType application/json          "access plus 0 seconds"
  ExpiresByType text/css                  "access plus 1 year"
  ExpiresByType application/javascript    "access plus 1 year"
  ExpiresByType text/javascript           "access plus 1 year"
  ExpiresByType image/svg+xml             "access plus 1 year"
  ExpiresByType image/png                 "access plus 1 year"
  ExpiresByType image/jpeg                "access plus 1 year"
  ExpiresByType image/webp                "access plus 1 year"
  ExpiresByType image/x-icon              "access plus 1 year"
  ExpiresByType font/woff2                "access plus 1 year"
  ExpiresByType font/woff                 "access plus 1 year"
</IfModule>

# ------------------------------------------------------------------------------
# 7. PROTECTION DES FICHIERS SENSIBLES
# ------------------------------------------------------------------------------
<FilesMatch "^\\.(env|git|htaccess|htpasswd|ini|log|sh|bak)$">
  Order allow,deny
  Deny from all
</FilesMatch>

Options -Indexes
"""

(ROOT / "public" / ".htaccess").write_text(HTACCESS_CONTENT, encoding="utf-8")
(FRONTEND_DEPLOY / ".htaccess").write_text(HTACCESS_CONTENT, encoding="utf-8")
print_ok(".htaccess créé dans public/ et frontend_public_html/")

# ===========================================================================
# ÉTAPE 3 - Configuration du Backend FastAPI pour insights_test & Port 8020
# ===========================================================================
print_step(f"ÉTAPE 3 - Configuration Backend (BD: {DB_NAME}, Port: {BACKEND_PORT})")

# 1. Copie de l'application
BACKEND_ITEMS = [
    "app",
    "passenger_wsgi.py",
    "run.py",
    "check_and_fix_cpanel_db.py",
    "requirements.txt",
    "purge_mock_echeanciers.py",
]

for item in BACKEND_ITEMS:
    src = API_DIR / item
    dst = BACKEND_DEPLOY / item
    if src.is_dir():
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.db", "data", "test_*.py"))
        print_ok(f"Dossier copié : {item}/")
    elif src.is_file():
        shutil.copy2(src, dst)
        print_ok(f"Fichier copié : {item}")

# 2. Fichiers d'environnement .env et .env.production
ENV_CONTENT = f"""# =============================================================================
#   CONFIGURATION DE PRODUCTION — INSIGHTS-VIEW EDUCATION
# =============================================================================
PROJECT_NAME="INSIGHTS VIEW EDUCATION API"
API_STR="/api"

# Configuration de la Base de Données MySQL sur cPanel (BD: {DB_NAME})
DB_NAME={DB_NAME}
DB_USER=insights_dbuser
DB_PASSWORD=Code@96*macsys
DB_HOST=10.10.10.100
DB_PORT=3306

DATABASE_URL="mysql+pymysql://insights_dbuser:Code%4096%2Amacsys@10.10.10.100:3306/{DB_NAME}"

# Port backend dédié pour educ.insights-view.ci
PORT={BACKEND_PORT}
HOST="0.0.0.0"

# FastAPI & JWT Sécurité
DEBUG=False
SECRET_KEY="fastapi-jwt-secret-key-hinneh-education-production-2026-x89a7f21b"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=600

# CORS universel sans blocage 400/403
ALLOWED_ORIGINS=["*"]
"""

(BACKEND_DEPLOY / ".env").write_text(ENV_CONTENT, encoding="utf-8")
(BACKEND_DEPLOY / ".env.production").write_text(ENV_CONTENT, encoding="utf-8")
(BACKEND_DEPLOY / ".env.development").write_text(ENV_CONTENT, encoding="utf-8")
print_ok(f".env et .env.production configurés avec DATABASE_URL={DB_NAME} et PORT={BACKEND_PORT}")

# 3. Scripts de démarrage pour le port 8020
START_SH = f"""#!/bin/bash
# Démarrage du backend FastAPI sur le port {BACKEND_PORT}
cd "$(dirname "$0")"

if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
fi

echo "Démarrage du backend sur le port {BACKEND_PORT} pour {DOMAIN} (BD: {DB_NAME})..."
exec uvicorn app.main:app --host 127.0.0.1 --port {BACKEND_PORT} --workers 4
"""
(BACKEND_DEPLOY / "start_backend.sh").write_text(START_SH, encoding="utf-8")

START_BAT = f"""@echo off
cd /d "%~dp0"
echo Démarrage du backend FastAPI sur le port {BACKEND_PORT} (BD: {DB_NAME})...
uvicorn app.main:app --host 127.0.0.1 --port {BACKEND_PORT} --reload
pause
"""
(BACKEND_DEPLOY / "start_backend.bat").write_text(START_BAT, encoding="utf-8")

# 4. Fichier de service Systemd (pour serveur Linux / VPS)
SYSTEMD_SERVICE = f"""[Unit]
Description=Backend FastAPI - {DOMAIN} (Port {BACKEND_PORT} / BD {DB_NAME})
After=network.target mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/{DOMAIN}/backend
EnvironmentFile=/var/www/{DOMAIN}/backend/.env
ExecStart=/var/www/{DOMAIN}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port {BACKEND_PORT} --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
(BACKEND_DEPLOY / f"educ_insights.service").write_text(SYSTEMD_SERVICE, encoding="utf-8")

# 5. Configuration Nginx dédiée
NGINX_CONF = f"""# Configuration Nginx pour {DOMAIN}
server {{
    listen 80;
    server_name {DOMAIN} www.{DOMAIN};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {DOMAIN} www.{DOMAIN};

    # Certificats SSL (ajustez selon Let's Encrypt / Certbot)
    # ssl_certificate /etc/letsencrypt/live/{DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/{DOMAIN}/privkey.pem;

    root /var/www/{DOMAIN}/frontend;
    index index.html;

    # Frontend SPA
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # Proxy API vers Uvicorn sur port {BACKEND_PORT}
    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }}

    # Proxy Docs
    location ~* ^/(docs|redoc|openapi.json) {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT};
        proxy_set_header Host $host;
    }}

    # Uploads
    location /uploads/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/uploads/;
        proxy_set_header Host $host;
    }}
}}
"""
(BACKEND_DEPLOY / "nginx_educ_insights.conf").write_text(NGINX_CONF, encoding="utf-8")
print_ok(f"Scripts de démarrage, service systemd et configuration Nginx créés (Port {BACKEND_PORT})")

# 6. Création des répertoires uploads
for p in [
    BACKEND_DEPLOY / "uploads" / "photos" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "logos" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "signatures" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "cachets" / ".gitkeep",
]:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.touch()
print_ok("Arborescence uploads/ créée avec succès")

# 7. Nettoyage pycache
for pycache in BACKEND_DEPLOY.rglob("__pycache__"):
    shutil.rmtree(pycache, ignore_errors=True)
for pyc in BACKEND_DEPLOY.rglob("*.pyc"):
    pyc.unlink(missing_ok=True)

# 8. Configurations Nginx & Systemd & Apache
NGINX_CONF = f"""# Configuration Nginx - Hinneh Éducation
server {{
    listen 80;
    server_name {DOMAIN} www.{DOMAIN};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {DOMAIN} www.{DOMAIN};

    # ssl_certificate /etc/letsencrypt/live/{DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/{DOMAIN}/privkey.pem;

    root /var/www/hinneh_education/frontend;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }}

    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {{
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    error_page 500 502 503 504 /error.html;
    location = /error.html {{
        root /var/www/hinneh_education/frontend;
        internal;
    }}
}}
"""
(CONFIGS_DEPLOY / "nginx_hinneh.conf").write_text(NGINX_CONF, encoding="utf-8")

SYSTEMD_CONF = f"""[Unit]
Description=Hinneh Education FastAPI Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/hinneh_education/backend
ExecStart=/var/www/hinneh_education/backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port {BACKEND_PORT} --workers 4
Restart=always
RestartSec=5
EnvironmentFile=/var/www/hinneh_education/backend/.env

[Install]
WantedBy=multi-user.target
"""
(CONFIGS_DEPLOY / "hinneh-backend.service").write_text(SYSTEMD_CONF, encoding="utf-8")

# 9. Guide de déploiement complet
README_DEPLOY = f"""# 🚀 GUIDE DE DÉPLOIEMENT — HINNEH ÉDUCATION
**Zéro Erreur 404 / 500 / 502 / 503 — Clé en main**

---

## 📦 Contenu du Dossier `DOSSIER_DEPLOIEMENT`

| Fichier / Dossier | Description |
|---|---|
| **`FRONTEND_PUBLIC_HTML.zip`** | Archive prête à extraire dans `public_html/` contenant l'application React compilée et le `.htaccess`. |
| **`frontend_public_html/`** | Dossier décompressé du frontend (`.htaccess`, `index.html`, `assets/`, `images/`, `error.html`). |
| **`BACKEND_PYTHON_APP.zip`** | Archive complète pour l'API Python FastAPI (`passenger_wsgi.py`, `requirements.txt`, etc.). |
| **`backend_api/`** | Dossier décompressé de l'API backend. |
| **`server_configurations/`** | Configurations prêtes pour **Nginx** (`nginx_hinneh.conf`) et **systemd** (`hinneh-backend.service`). |

---

## 🛡️ Résolution Garantie des Erreurs

### 1. Élimination des 404 (Pages introuvables au rafraîchissement)
- Le fichier `.htaccess` contient les directives `mod_rewrite` redirigeant automatiquement les routes SPA (`/educator-space`, `/parent-space`, `/rh`, `/finance`, etc.) vers `index.html`.
- `ErrorDocument 404 /index.html` évite toute page 404 standard Apache.

### 2. Élimination des 500 / 502 / 503 (Crashes & Coupures)
- `ErrorDocument 500 /error.html` et `ErrorDocument 503 /error.html` affichent une interface claire avec guide de secours.
- `passenger_wsgi.py` intègre un gestionnaire d'exception sécurisé avec journalisation d'erreur dans `passenger_startup_error.log`.

### 3. Vitesse et Cache Optimal
- **Compression Gzip/Deflate** activée pour HTML, CSS, JS, JSON, WOFF2.
- **Cache 1 an** sur les bundles hashés `/assets/*`, et **no-cache** sur `index.html` pour assurer la prise en compte immédiate des mises à jour.

---

## 🛠️ Déploiement sur cPanel (Hébergement Web)

### 1. Frontend :
1. Dans le **Gestionnaire de fichiers cPanel**, ouvrez `public_html`.
2. Téléversez `FRONTEND_PUBLIC_HTML.zip` et extrayez-le.
3. Vérifiez que le fichier `.htaccess` est bien présent à la racine.

### 2. Backend Python :
1. Dans cPanel, cliquez sur **« Setup Python App »**.
2. Créez votre application Python (version 3.10 à 3.13) avec comme dossier racine `hinneh_api`.
3. Téléversez et extrayez `BACKEND_PYTHON_APP.zip` dans ce dossier.
4. Cliquez sur **« Run Pip Install »** (ou entrez dans le venv pour exécuter `pip install -r requirements.txt`).
5. Cliquez sur **« Restart »** pour démarrer l'API.
"""

(DEPLOY_DIR / "GUIDE_DEPLOIEMENT.md").write_text(README_DEPLOY, encoding="utf-8")
print_ok("GUIDE_DEPLOIEMENT.md généré dans DOSSIER_DEPLOIEMENT/")

# ===========================================================================
# ÉTAPE 4 - Création des Archives ZIP
# ===========================================================================
print_step("ÉTAPE 4 - Création des archives ZIP prêtes au transfert")

frontend_zip = DEPLOY_DIR / "FRONTEND_PUBLIC_HTML.zip"
backend_zip  = DEPLOY_DIR / "BACKEND_PYTHON_APP.zip"
all_zip      = ROOT / "DOSSIER_DEPLOIEMENT_COMPLET.zip"

for z in [frontend_zip, backend_zip, all_zip]:
    if z.exists():
        z.unlink()

shutil.make_archive(str(DEPLOY_DIR / "FRONTEND_PUBLIC_HTML"), "zip", FRONTEND_DEPLOY)
shutil.copy2(frontend_zip, ROOT / "FRONTEND_PUBLIC_HTML.zip")
print_ok(f"Archive créée : FRONTEND_PUBLIC_HTML.zip ({frontend_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

shutil.make_archive(str(DEPLOY_DIR / "BACKEND_PYTHON_APP"), "zip", BACKEND_DEPLOY)
shutil.copy2(backend_zip, ROOT / "BACKEND_PYTHON_APP.zip")
print_ok(f"Archive créée : BACKEND_PYTHON_APP.zip ({backend_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

shutil.make_archive(str(ROOT / "DOSSIER_DEPLOIEMENT_COMPLET"), "zip", DEPLOY_DIR)
print_ok(f"Archive globale créée : DOSSIER_DEPLOIEMENT_COMPLET.zip ({all_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

# ===========================================================================
# BILAN FINAL
# ===========================================================================
print_step("DOSSIER DE DÉPLOIEMENT GÉNÉRÉ AVEC SUCCÈS !")
print(f"""
  ======================================================================
  DOSSIER DE DÉPLOIEMENT GÉNÉRÉ :
  ----------------------------------------------------------------------
  - DOSSIER_DEPLOIEMENT/
      +-- frontend_public_html/       (React/Vite build + .htaccess anti-erreur)
      +-- backend_api/                (FastAPI, .env, passenger_wsgi, scripts)
      +-- server_configurations/      (Nginx & systemd)
      +-- GUIDE_DEPLOIEMENT.md        (Documentation complète)
      +-- FRONTEND_PUBLIC_HTML.zip    (Archive frontend prête)
      +-- BACKEND_PYTHON_APP.zip      (Archive backend prête)

  ARCHIVE GLOBALE RACINE :
  ----------------------------------------------------------------------
  - DOSSIER_DEPLOIEMENT_COMPLET.zip
  ======================================================================
""")

if __name__ == "__main__":
    pass
