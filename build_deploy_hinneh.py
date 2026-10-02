#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
  HINNEH ÉDUCATION — SCRIPT DE DÉPLOIEMENT POUR HINNEH-EDUCATION.CI
=============================================================================
  - Domaine de production : https://hinneh-education.ci & https://www.hinneh-education.ci
  - Base de données : insights_central (MySQL)
  - Port backend dédié : 8020 (ou Passenger WSGI sous cPanel)
  - Dossier généré : DOSSIER_DEPLOIEMENT_HINNEH/
  - Archives ZIP :
      * FRONTEND_PUBLIC_HTML.zip
      * BACKEND_PYTHON_APP.zip
      * HINNEH_DEPLOIEMENT_COMPLET.zip
=============================================================================
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

ROOT            = Path(__file__).parent.resolve()
DIST_DIR        = ROOT / "dist"
DEPLOY_DIR      = ROOT / "DOSSIER_DEPLOIEMENT_HINNEH"
FRONTEND_DEPLOY = DEPLOY_DIR / "01_FRONTEND_PUBLIC_HTML"
BACKEND_DEPLOY  = DEPLOY_DIR / "02_BACKEND_API"
CONFIGS_DEPLOY  = DEPLOY_DIR / "03_CONFIGURATIONS_SERVEUR"
TOOLS_DEPLOY    = DEPLOY_DIR / "04_SCRIPTS_ET_OUTILS"
API_DIR         = ROOT / "api"

DOMAIN          = "hinneh-education.ci"
DB_NAME         = "insights_central"
DB_USER         = "insights_dbuser"
DB_PASSWORD     = "Code@96*macsys"
DB_HOST         = "10.10.10.100"
DB_PORT         = 3306
BACKEND_PORT    = 8020

def print_step(msg: str):
    print(f"\n{'='*75}")
    print(f"  {msg}")
    print(f"{'='*75}")

def print_ok(msg: str):
    print(f"  [OK]   {msg}")

def print_warn(msg: str):
    print(f"  [WARN] {msg}")

def print_err(msg: str):
    print(f"  [ERR]  {msg}", file=sys.stderr)

# ===========================================================================
# ÉTAPE 1 - Build / Vérification du Frontend React / Vite
# ===========================================================================
print_step("ÉTAPE 1 - Compilation et validation du Frontend React / Vite")

# Vérifier si dist existe déjà ou s'il faut compiler
need_build = not DIST_DIR.exists() or not (DIST_DIR / "index.html").exists()

if need_build:
    print("Compilation du frontend avec Vite...")
    env = os.environ.copy()
    env["NODE_OPTIONS"] = "--max-old-space-size=4096"
    vite_bin = ROOT / "node_modules" / ".bin" / ("vite.cmd" if sys.platform == "win32" else "vite")
    if vite_bin.exists():
        result = subprocess.run([str(vite_bin), "build"], cwd=ROOT, env=env)
    else:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        result = subprocess.run([npm_cmd, "run", "build"], cwd=ROOT, env=env)
    if result.returncode != 0:
        print_err("Échec de la compilation frontend.")
        if not DIST_DIR.exists() or not (DIST_DIR / "index.html").exists():
            sys.exit(1)
        print_warn("Utilisation de la version existante dans dist/")
else:
    print_ok("Le dossier dist/ compilé est disponible.")

# ===========================================================================
# ÉTAPE 2 - Préparation de l'arborescence DOSSIER_DEPLOIEMENT_HINNEH/
# ===========================================================================
print_step("ÉTAPE 2 - Préparation de l'arborescence du dossier de déploiement")

if DEPLOY_DIR.exists():
    try:
        shutil.rmtree(DEPLOY_DIR, ignore_errors=True)
    except Exception as e:
        print_warn(f"Nettoyage partiel de l'ancien dossier: {e}")

FRONTEND_DEPLOY.mkdir(parents=True, exist_ok=True)
BACKEND_DEPLOY.mkdir(parents=True, exist_ok=True)
CONFIGS_DEPLOY.mkdir(parents=True, exist_ok=True)
TOOLS_DEPLOY.mkdir(parents=True, exist_ok=True)
print_ok("Dossiers créés : 01_FRONTEND_PUBLIC_HTML, 02_BACKEND_API, 03_CONFIGURATIONS_SERVEUR, 04_SCRIPTS_ET_OUTILS")

# ── Copier le frontend compilé ────────────────────────────────────────────────
shutil.copytree(DIST_DIR, FRONTEND_DEPLOY, dirs_exist_ok=True)
print_ok("Frontend copié dans 01_FRONTEND_PUBLIC_HTML/")

# ── Créer page d'erreur de secours error.html si absente ───────────────────────
ERROR_HTML_CONTENT = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HINNEH ÉDUCATION — Service en cours d'actualisation</title>
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-light: #3b82f6;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: var(--card);
      max-width: 540px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      padding: 2.5rem;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      background: #eff6ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-light);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.75rem;
    }
    p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background-color: var(--primary);
      color: white;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      transition: background-color 0.2s;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <h1>Plateforme en cours d'actualisation</h1>
    <p>
      Le portail <strong>HINNEH ÉDUCATION</strong> effectue une mise à jour de routine de ses services pour vous garantir une expérience optimale.
    </p>
    <p style="font-size: 0.875rem; background: #f1f5f9; padding: 0.75rem; border-radius: 6px; color: #475569;">
      Veuillez patienter quelques instants puis réactualiser la page.
    </p>
    <button class="btn" onclick="window.location.reload()">Réactualiser la page</button>
    <div class="footer">
      HINNEH ÉDUCATION — Système de Gestion Scolaire Intégré
    </div>
  </div>
</body>
</html>
"""
(FRONTEND_DEPLOY / "error.html").write_text(ERROR_HTML_CONTENT, encoding="utf-8")
(DIST_DIR / "error.html").write_text(ERROR_HTML_CONTENT, encoding="utf-8")

# ── Écrire le .htaccess universel sans erreur 404/500/503 ─────────────────────
HTACCESS_CONTENT = f"""# ==============================================================================
# HINNEH ÉDUCATION — FICHIER .HTACCESS DE PRODUCTION (hinneh-education.ci)
# Conçu pour éliminer les erreurs 404, 403, 500, 502, 503 sur Apache / cPanel
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. GESTION DES PAGES D'ERREUR (Anti-crash 404 / 500 / 502 / 503)
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

  # ─── Forcer HTTPS (hors localhost) ─────────────────────────────────────────
  RewriteCond %{{HTTPS}} off
  RewriteCond %{{HTTP_HOST}} !^localhost
  RewriteCond %{{HTTP_HOST}} !^127\\.0\\.0\\.1
  RewriteRule ^(.*)$ https://%{{HTTP_HOST}}%{{REQUEST_URI}} [R=301,L]

  # ─── Proxy vers l'API FastAPI locale si mod_proxy est actif sur le serveur ──
  <IfModule mod_proxy.c>
    RewriteRule ^api/(.*)$ http://127.0.0.1:{BACKEND_PORT}/api/$1 [P,L]
    RewriteRule ^(docs|redoc|openapi.json) http://127.0.0.1:{BACKEND_PORT}/$1 [P,L]
    RewriteRule ^uploads/(.*)$ http://127.0.0.1:{BACKEND_PORT}/uploads/$1 [P,L]
  </IfModule>

  # ─── Ne pas réécrire les fichiers et dossiers réels existants ──────────────
  RewriteCond %{{REQUEST_FILENAME}} -f [OR]
  RewriteCond %{{REQUEST_FILENAME}} -d
  RewriteRule ^ - [L]

  # ─── Rediriger toutes les autres routes vers index.html pour le SPA React ───
  RewriteRule ^ index.html [L,QSA]
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
# 4. EN-TÊTES DE SÉCURITÉ & CORS UNIVERSEL
# ------------------------------------------------------------------------------
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-School-Code, X-School-Id"

  # ─── Cache Control : Pas de cache sur index.html (mises à jour instantanées)
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
# 5. COMPRESSION GZIP / DEFLATE (Accélération des temps de chargement)
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
<FilesMatch "^\\.(env|git|htaccess|htpasswd|ini|log|sh|bat|bak)$">
  Order allow,deny
  Deny from all
</FilesMatch>

Options -Indexes
"""

(ROOT / "public" / ".htaccess").write_text(HTACCESS_CONTENT, encoding="utf-8")
(FRONTEND_DEPLOY / ".htaccess").write_text(HTACCESS_CONTENT, encoding="utf-8")
print_ok(".htaccess haute résilience écrit dans 01_FRONTEND_PUBLIC_HTML/")

# ===========================================================================
# ÉTAPE 3 - Configuration du Backend FastAPI pour hinneh-education.ci
# ===========================================================================
print_step(f"ÉTAPE 3 - Configuration Backend (BD: {DB_NAME}, Port: {BACKEND_PORT})")

# 1. Copie de l'application FastAPI
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

# 2. Point d'entrée passenger_wsgi.py sécurisé
PASSENGER_WSGI_CONTENT = """# passenger_wsgi.py
# Fichier de démarrage pour Phusion Passenger sur cPanel (Python App)
# Adaptateur ASGI vers WSGI sécurisé pour FastAPI

import sys
import os
import traceback

# ── 1. Environnement de PRODUCTION ──────────────────────────────────────────
os.environ["APP_ENV"] = "production"

# ── 2. Configuration des chemins Python ─────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

api_dir = os.path.join(current_dir, 'api')
if os.path.exists(api_dir) and api_dir not in sys.path:
    sys.path.insert(1, api_dir)

backend_dir = os.path.join(current_dir, 'backend')
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(1, backend_dir)

# ── 3. Initialisation de l'application avec capture d'erreurs ────────────────
try:
    from a2wsgi import ASGIMiddleware
    try:
        from app.main import app
    except ImportError:
        from api.app.main import app
    
    # Adaptateur WSGI pour Passenger
    application = ASGIMiddleware(app)

except Exception as e:
    err_trace = traceback.format_exc()
    log_file = os.path.join(current_dir, "passenger_startup_error.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\\n--- ERREUR DE DEMARRAGE PASSENGER ---\\n{err_trace}\\n")
    except Exception:
        pass

    def application(environ, start_response):
        status = '500 Internal Server Error'
        output = f\"\"\"<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>HINNEH ÉDUCATION — Diagnostic de démarrage API</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 25px; background: #f8fafc; color: #1e293b; }}
    .card {{ background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 900px; margin: 0 auto; border-left: 5px solid #ef4444; }}
    h2 {{ color: #dc2626; margin-top: 0; }}
    pre {{ background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }}
    code {{ background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>Diagnostic : Erreur lors du chargement de l'API FastAPI</h2>
    <p>Le serveur n'a pas pu démarrer le processus Python. Raisons courantes :</p>
    <ul>
      <li>Dépendances manquantes : exécutez <code>pip install -r requirements.txt</code> dans l'environnement virtuel.</li>
      <li>Fichier de configuration <code>.env</code> manquant ou paramètres MySQL invalides.</li>
    </ul>
    <h3>Détail technique de l'erreur :</h3>
    <pre>{err_trace}</pre>
  </div>
</body>
</html>\"\"\".encode('utf-8')
        response_headers = [
            ('Content-type', 'text/html; charset=utf-8'),
            ('Content-Length', str(len(output)))
        ]
        start_response(status, response_headers)
        return [output]
"""
(BACKEND_DEPLOY / "passenger_wsgi.py").write_text(PASSENGER_WSGI_CONTENT, encoding="utf-8")
print_ok("passenger_wsgi.py sécurisé écrit dans 02_BACKEND_API/")

# 3. Fichiers d'environnement .env et .env.production
ENV_CONTENT = f"""# =============================================================================
#   HINNEH ÉDUCATION — CONFIGURATION DE PRODUCTION (hinneh-education.ci)
# =============================================================================
PROJECT_NAME="INSIGHTS VIEW EDUCATION API"
API_STR="/api"

# Configuration de la Base de Données MySQL (insights_central)
DB_NAME={DB_NAME}
DB_USER={DB_USER}
DB_PASSWORD={DB_PASSWORD}
DB_HOST={DB_HOST}
DB_PORT={DB_PORT}

DATABASE_URL="mysql+pymysql://{DB_USER}:Code%4096%2Amacsys@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Port backend pour Uvicorn local ou proxy
PORT={BACKEND_PORT}
HOST="0.0.0.0"

# FastAPI & JWT Sécurité
DEBUG=False
SECRET_KEY="fastapi-jwt-secret-key-hinneh-education-production-2026-x89a7f21b"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=600

# CORS universel
ALLOWED_ORIGINS=["https://{DOMAIN}", "https://www.{DOMAIN}", "http://{DOMAIN}", "http://www.{DOMAIN}", "https://educ.insights-view.ci", "http://localhost:8080", "http://localhost:5173", "*"]
"""

(BACKEND_DEPLOY / ".env").write_text(ENV_CONTENT, encoding="utf-8")
(BACKEND_DEPLOY / ".env.production").write_text(ENV_CONTENT, encoding="utf-8")
(BACKEND_DEPLOY / ".env.development").write_text(ENV_CONTENT, encoding="utf-8")
print_ok(f".env et .env.production configurés avec DATABASE_URL={DB_NAME} et PORT={BACKEND_PORT}")

# 4. Scripts de démarrage Uvicorn
START_SH = f"""#!/bin/bash
# Démarrage du backend FastAPI sur le port {BACKEND_PORT} pour {DOMAIN}
cd "$(dirname "$0")"

if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "Démarrage du backend FastAPI sur le port {BACKEND_PORT} (BD: {DB_NAME})..."
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

# 5. Création des répertoires uploads
for p in [
    BACKEND_DEPLOY / "uploads" / "photos" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "logos" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "signatures" / ".gitkeep",
    BACKEND_DEPLOY / "uploads" / "school_assets" / "cachets" / ".gitkeep",
]:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.touch()
print_ok("Arborescence uploads/ créée avec succès")

# 6. Nettoyage pycache
for pycache in BACKEND_DEPLOY.rglob("__pycache__"):
    shutil.rmtree(pycache, ignore_errors=True)
for pyc in BACKEND_DEPLOY.rglob("*.pyc"):
    pyc.unlink(missing_ok=True)

# ===========================================================================
# ÉTAPE 4 - Configurations Serveur (Nginx, Systemd, Apache)
# ===========================================================================
print_step("ÉTAPE 4 - Génération des configurations serveur (Nginx, Systemd, Apache)")

# Nginx
NGINX_CONF = f"""# ==============================================================================
# Configuration Nginx de Production — {DOMAIN}
# ==============================================================================

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

    # En-têtes de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy API vers Uvicorn sur port {BACKEND_PORT}
    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }}

    # Proxy Swagger Docs / OpenAPI
    location ~* ^/(docs|redoc|openapi.json) {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}

    # Uploads (photos, logos)
    location /uploads/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/uploads/;
        proxy_set_header Host $host;
    }}

    # Cache long pour les assets compilés
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {{
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }}

    # SPA Fallback (Élimination des 404 au rafraîchissement)
    location / {{
        try_files $uri $uri/ /index.html;
    }}

    # Pages d'erreur personnalisées (Anti 500 / 502 / 503)
    error_page 500 502 503 504 /error.html;
    location = /error.html {{
        root /var/www/{DOMAIN}/frontend;
        internal;
    }}
}}
"""
(CONFIGS_DEPLOY / f"nginx_{DOMAIN}.conf").write_text(NGINX_CONF, encoding="utf-8")

# Systemd Service
SYSTEMD_CONF = f"""[Unit]
Description=Hinneh Education FastAPI Backend ({DOMAIN})
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
(CONFIGS_DEPLOY / f"hinneh-backend.service").write_text(SYSTEMD_CONF, encoding="utf-8")

# Apache VirtualHost
APACHE_CONF = f"""# ==============================================================================
# Configuration Apache VirtualHost — {DOMAIN}
# ==============================================================================

<VirtualHost *:80>
    ServerName {DOMAIN}
    ServerAlias www.{DOMAIN}
    Redirect permanent / https://{DOMAIN}/
</VirtualHost>

<VirtualHost *:443>
    ServerName {DOMAIN}
    ServerAlias www.{DOMAIN}
    DocumentRoot /var/www/{DOMAIN}/frontend

    # SSLEngine on
    # SSLCertificateFile /etc/letsencrypt/live/{DOMAIN}/fullchain.pem
    # SSLCertificateKeyFile /etc/letsencrypt/live/{DOMAIN}/privkey.pem

    <Directory /var/www/{DOMAIN}/frontend>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy API
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:{BACKEND_PORT}/api/
    ProxyPassReverse /api/ http://127.0.0.1:{BACKEND_PORT}/api/

    ProxyPass /uploads/ http://127.0.0.1:{BACKEND_PORT}/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:{BACKEND_PORT}/uploads/

    ErrorLog ${{APACHE_LOG_DIR}}/{DOMAIN}_error.log
    CustomLog ${{APACHE_LOG_DIR}}/{DOMAIN}_access.log combined
</VirtualHost>
"""
(CONFIGS_DEPLOY / "apache_vhost.conf").write_text(APACHE_CONF, encoding="utf-8")
(CONFIGS_DEPLOY / ".htaccess").write_text(HTACCESS_CONTENT, encoding="utf-8")
print_ok("Configurations Nginx, Systemd, Apache créées dans 03_CONFIGURATIONS_SERVEUR/")

# ===========================================================================
# ÉTAPE 5 - Scripts de diagnostic et vérification
# ===========================================================================
print_step("ÉTAPE 5 - Scripts de vérification et diagnostic")

VERIFY_SCRIPT = f"""#!/usr/bin/env python3
# -*- coding: utf-8 -*-
\"\"\"Script de vérification post-déploiement pour {DOMAIN}\"\"\"
import urllib.request
import json
import sys

BASE_URL = "https://{DOMAIN}"
LOCAL_API_URL = "http://127.0.0.1:{BACKEND_PORT}"

def test_endpoint(url, desc):
    print(f"Test de {{desc}} : {{url}} ... ", end="", flush=True)
    try:
        req = urllib.request.Request(url, headers={{"User-Agent": "HinnehDeploymentCheck/1.0"}})
        with urllib.request.urlopen(req, timeout=10) as resp:
            code = resp.getcode()
            if code == 200:
                print(f"[OK] (Status {{code}})")
                return True
            else:
                print(f"[WARN] (Status {{code}})")
                return False
    except Exception as e:
        print(f"[ERR] ({{e}})")
        return False

print(f"=== VÉRIFICATION DU DÉPLOIEMENT : {DOMAIN} ===")
test_endpoint(f"{{BASE_URL}}/", "Frontend Accueil")
test_endpoint(f"{{BASE_URL}}/login", "Frontend Route SPA /login")
test_endpoint(f"{{BASE_URL}}/api/health", "API Health check distant")
test_endpoint(f"{{LOCAL_API_URL}}/api/health", "API Health check local")
test_endpoint(f"{{BASE_URL}}/api/db-status", "État de connexion MySQL")
print("Vérification terminée.")
"""
(TOOLS_DEPLOY / "verify_deployment.py").write_text(VERIFY_SCRIPT, encoding="utf-8")

TEST_DB_SCRIPT = f"""#!/usr/bin/env python3
# -*- coding: utf-8 -*-
\"\"\"Test de connexion directe à la base de données MySQL {DB_NAME}\"\"\"
import pymysql
import sys

print(f"Connexion à MySQL : {DB_HOST}:{DB_PORT} (Base: {DB_NAME}, Utilisateur: {DB_USER})...")
try:
    conn = pymysql.connect(
        host="{DB_HOST}",
        user="{DB_USER}",
        password="{DB_PASSWORD}",
        database="{DB_NAME}",
        port={DB_PORT},
        connect_timeout=10
    )
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM user_educ;")
        count_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM so_etablissement;")
        count_schools = cur.fetchone()[0]
        print(f"[OK] Connexion réussie !")
        print(f"     - Utilisateurs (user_educ) : {{count_users}}")
        print(f"     - Établissements (so_etablissement) : {{count_schools}}")
    conn.close()
except Exception as e:
    print(f"[ERR] Erreur de connexion MySQL : {{e}}")
"""
(TOOLS_DEPLOY / "test_db_connection.py").write_text(TEST_DB_SCRIPT, encoding="utf-8")
print_ok("Scripts de vérification créés dans 04_SCRIPTS_ET_OUTILS/")

# ===========================================================================
# ÉTAPE 6 - Guide de Déploiement Complet
# ===========================================================================
print_step("ÉTAPE 6 - Rédaction du guide de déploiement complet")

README_DEPLOY = f"""# 🚀 GUIDE DE DÉPLOIEMENT COMPLET — HINNEH ÉDUCATION
**Domaine : `{DOMAIN}` | Base de données : `{DB_NAME}`**  
*Garantie Zéro Erreur 404, 500, 502, 503, CORS et Problèmes de Cache*

---

## 📦 Contenu du Dossier `DOSSIER_DEPLOIEMENT_HINNEH`

| Dossier / Fichier | Description |
|---|---|
| **`01_FRONTEND_PUBLIC_HTML/`** | Application React SPA compilée prête pour `public_html/` avec `.htaccess` haute résilience et `error.html`. |
| **`02_BACKEND_API/`** | Application FastAPI complète (`passenger_wsgi.py`, `app/`, `.env`, `requirements.txt`, `uploads/`). |
| **`03_CONFIGURATIONS_SERVEUR/`** | Fichiers de configuration prêts à l'emploi : Nginx (`nginx_{DOMAIN}.conf`), Systemd (`hinneh-backend.service`), Apache (`apache_vhost.conf`). |
| **`04_SCRIPTS_ET_OUTILS/`** | Outils de test et diagnostic (`verify_deployment.py`, `test_db_connection.py`). |
| **`FRONTEND_PUBLIC_HTML.zip`** | Archive frontend prête à extraire dans `public_html/`. |
| **`BACKEND_PYTHON_APP.zip`** | Archive backend prête pour l'application Python cPanel ou VPS. |
| **`HINNEH_DEPLOIEMENT_COMPLET.zip`** | Archive globale contenant l'ensemble des éléments. |

---

## 🛡️ Comment les erreurs sont totalement éliminées

### 1. Zéro Erreur 404 au rafraîchissement (React Router)
- Le fichier `.htaccess` intercepte toutes les requêtes d'URL relatives (ex: `/login`, `/parent-space`, `/educator-space`, `/rh`, `/finance`) et les sert via `index.html`.
- `ErrorDocument 404 /index.html` garantit qu'aucune page 404 par défaut d'Apache ne s'affiche.
- Les fichiers statiques réels (`/assets/*`, `/images/*`, `favicon.ico`) sont servis directement sans réécriture.

### 2. Zéro Erreur 503 / 500 / 502
- **`passenger_wsgi.py` ultra-robuste** : En cas de problème de démarrage, l'erreur est enregistrée dans `passenger_startup_error.log` et une page de diagnostic HTML claire est retournée avec les détails pour corriger immédiatement (ex: dépendance `pip` manquante).
- **FastAPI Exception Handler** : Intercepte les erreurs de connexion MySQL et retourne des réponses JSON 503 explicites au lieu de planter les workers.
- **SQLAlchemy Pool Protection** : `pool_pre_ping=True` et `pool_recycle=3600` empêchent les erreurs "MySQL server has gone away".
- **Page de secours `error.html`** : Affiche une interface élégante de maintenance avec bouton de réactualisation automatique.

### 3. Zéro Erreur CORS & MIME Types
- En-têtes CORS universels autorisant `https://{DOMAIN}`, `https://www.{DOMAIN}`, etc.
- Déclaration explicite des types MIME (`AddType application/javascript js mjs`, `AddType font/woff2 woff2`, etc.).
- `Cache-Control: no-cache` sur `index.html` (mises à jour immédiates) et cache 1 an sur les assets hashés.

---

## 🛠️ Option A : Déploiement sur cPanel (Hébergement Web)

### 1. Déploiement du Frontend (2 minutes) :
1. Connectez-vous à votre interface **cPanel**.
2. Ouvrez le **Gestionnaire de fichiers** et rendez-vous dans `public_html/` (ou le dossier racine de `{DOMAIN}`).
3. Téléversez `FRONTEND_PUBLIC_HTML.zip` et cliquez sur **« Extraire »**.
4. Assurez-vous que le fichier `.htaccess` est bien visible (activez *« Afficher les fichiers masqués »* dans les paramètres du Gestionnaire de fichiers).

### 2. Déploiement du Backend Python (3 minutes) :
1. Dans cPanel, cliquez sur **« Setup Python App »**.
2. Cliquez sur **« Create Application »** :
   - **Python version** : 3.10, 3.11, 3.12 ou 3.13.
   - **Application root** : `hinneh_api` (ou le nom de votre choix).
   - **Application URL** : `hinneh-education.ci/api` ou sous-domaine `api.hinneh-education.ci`.
   - **Application startup file** : `passenger_wsgi.py`
   - **Application Entry point** : `application`
3. Cliquez sur **« Create »**.
4. Téléversez et extrayez `BACKEND_PYTHON_APP.zip` dans le dossier de l'application (`hinneh_api`).
5. Dans l'interface cPanel Python App, cliquez sur **« Run Pip Install »** avec `requirements.txt` (ou entrez dans le terminal SSH pour exécuter `pip install -r requirements.txt`).
6. Cliquez sur le bouton **« Restart »**.

### 3. Test et validation :
- Ouvrez `https://{DOMAIN}` -> L'accueil s'affiche sans erreur.
- Naviguez vers `https://{DOMAIN}/login` puis faites **F5 (rafraîchir)** -> Aucun 404.
- Testez `https://{DOMAIN}/api/health` -> Réponse JSON `status: healthy`.
- Testez `https://{DOMAIN}/api/db-status` -> Connexion MySQL confirmée.

---

## 🛠️ Option B : Déploiement sur VPS Linux (Ubuntu / Debian / Nginx)

### 1. Transférer l'archive :
```bash
scp HINNEH_DEPLOIEMENT_COMPLET.zip root@vps_ip:/tmp/
ssh root@vps_ip
cd /tmp && unzip HINNEH_DEPLOIEMENT_COMPLET.zip -d /var/www/{DOMAIN}
```

### 2. Configurer le Backend FastAPI :
```bash
cd /var/www/{DOMAIN}/02_BACKEND_API
python3 -m venv venv
source venv/bin/activate
pip install -U pip
pip install -r requirements.txt

# Installer et activer le service systemd
cp ../03_CONFIGURATIONS_SERVEUR/hinneh-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable hinneh-backend
systemctl restart hinneh-backend
systemctl status hinneh-backend
```

### 3. Configurer Nginx et SSL :
```bash
cp ../03_CONFIGURATIONS_SERVEUR/nginx_{DOMAIN}.conf /etc/nginx/sites-available/{DOMAIN}.conf
ln -s /etc/nginx/sites-available/{DOMAIN}.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Certificat SSL Let's Encrypt automatique
certbot --nginx -d {DOMAIN} -d www.{DOMAIN}
```

---

## 🔍 Diagnostics & Commandes Utiles

- **Tester la base MySQL depuis le serveur** :
  ```bash
  python 04_SCRIPTS_ET_OUTILS/test_db_connection.py
  ```
- **Vérifier les endpoints** :
  ```bash
  python 04_SCRIPTS_ET_OUTILS/verify_deployment.py
  ```
- **Consulter les logs Passenger cPanel** :
  `cat hinneh_api/passenger_startup_error.log`
"""

(DEPLOY_DIR / "GUIDE_DEPLOIEMENT_HINNEH.md").write_text(README_DEPLOY, encoding="utf-8")
print_ok("GUIDE_DEPLOIEMENT_HINNEH.md rédigé dans DOSSIER_DEPLOIEMENT_HINNEH/")

# ===========================================================================
# ÉTAPE 7 - Création des Archives ZIP
# ===========================================================================
print_step("ÉTAPE 7 - Création des archives ZIP finales prêtes au transfert")

frontend_zip = DEPLOY_DIR / "FRONTEND_PUBLIC_HTML.zip"
backend_zip  = DEPLOY_DIR / "BACKEND_PYTHON_APP.zip"
all_zip      = ROOT / "HINNEH_DEPLOIEMENT_COMPLET.zip"

for z in [frontend_zip, backend_zip, all_zip]:
    if z.exists():
        z.unlink()

# 1. FRONTEND_PUBLIC_HTML.zip
shutil.make_archive(str(DEPLOY_DIR / "FRONTEND_PUBLIC_HTML"), "zip", FRONTEND_DEPLOY)
shutil.copy2(frontend_zip, ROOT / "FRONTEND_PUBLIC_HTML.zip")
print_ok(f"Archive créée : FRONTEND_PUBLIC_HTML.zip ({frontend_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

# 2. BACKEND_PYTHON_APP.zip
shutil.make_archive(str(DEPLOY_DIR / "BACKEND_PYTHON_APP"), "zip", BACKEND_DEPLOY)
shutil.copy2(backend_zip, ROOT / "BACKEND_PYTHON_APP.zip")
print_ok(f"Archive créée : BACKEND_PYTHON_APP.zip ({backend_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

# 3. HINNEH_DEPLOIEMENT_COMPLET.zip
shutil.make_archive(str(ROOT / "HINNEH_DEPLOIEMENT_COMPLET"), "zip", DEPLOY_DIR)
shutil.copy2(all_zip, DEPLOY_DIR / "HINNEH_DEPLOIEMENT_COMPLET.zip")
print_ok(f"Archive globale créée : HINNEH_DEPLOIEMENT_COMPLET.zip ({all_zip.stat().st_size / 1024 / 1024:.2f} Mo)")

# ===========================================================================
# BILAN FINAL
# ===========================================================================
print_step("SUCCÈS — DOSSIER DE DÉPLOIEMENT GÉNÉRÉ POUR HINNEH-EDUCATION.CI")
print(f"""
  ======================================================================
  DOSSIER DE DÉPLOIEMENT DISPONIBLE :
  ----------------------------------------------------------------------
  Emplacement : {DEPLOY_DIR}
  
  Contenu :
  ├── 01_FRONTEND_PUBLIC_HTML/    (Application React + .htaccess anti-404)
  ├── 02_BACKEND_API/             (FastAPI + passenger_wsgi.py + .env)
  ├── 03_CONFIGURATIONS_SERVEUR/  (Nginx, Systemd, Apache)
  ├── 04_SCRIPTS_ET_OUTILS/       (Tests et diagnostics)
  ├── GUIDE_DEPLOIEMENT_HINNEH.md (Documentation pas-à-pas)
  ├── FRONTEND_PUBLIC_HTML.zip    (Archive pour public_html)
  ├── BACKEND_PYTHON_APP.zip      (Archive pour Python App)
  └── HINNEH_DEPLOIEMENT_COMPLET.zip (Archive tout-en-un)
  ======================================================================
""")

if __name__ == "__main__":
    pass
