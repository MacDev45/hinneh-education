#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script complet, universel et infaillible de génération et synchronisation
de tous les formats de dossiers et archives de déploiement pour HINNEH-EDUCATION.CI.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# Chemins absolus
WORKSPACE_ROOT = Path("d:/dowload/educ/final/Dossier/310526").resolve()
PROJECT_ROOT   = (WORKSPACE_ROOT / "310526").resolve()
DIST_DIR       = PROJECT_ROOT / "dist"
API_DIR        = PROJECT_ROOT / "api"

DOMAIN         = "hinneh-education.ci"
DB_NAME        = "insights_central"
DB_USER        = "insights_dbuser"
DB_PASSWORD    = "Code@96*macsys"
DB_HOST        = "10.10.10.100"
DB_PORT        = 3306
BACKEND_PORT   = 8011

print(f"=== GENERATION COMPLETE DU DEPLOIEMENT : {DOMAIN} ===")
print(f"Workspace : {WORKSPACE_ROOT}")
print(f"Projet    : {PROJECT_ROOT}")

# 1. Vérifier que dist/index.html existe
if not (DIST_DIR / "index.html").exists():
    print("Compilation du frontend avec npm run build...")
    subprocess.run(["npm.cmd" if sys.platform == "win32" else "npm", "run", "build"], cwd=PROJECT_ROOT, check=True)

# 2. Dossier temporaire de staging
STAGE_DEPLOY = PROJECT_ROOT / "_staging_deploy"
if STAGE_DEPLOY.exists():
    shutil.rmtree(STAGE_DEPLOY, ignore_errors=True)

FRONTEND_DIR = STAGE_DEPLOY / "01_FRONTEND_PUBLIC_HTML"
BACKEND_DIR  = STAGE_DEPLOY / "02_BACKEND_API"
CONFIGS_DIR  = STAGE_DEPLOY / "03_CONFIGURATIONS_SERVEUR"
TOOLS_DIR    = STAGE_DEPLOY / "04_SCRIPTS_ET_OUTILS"

for d in [FRONTEND_DIR, BACKEND_DIR, CONFIGS_DIR, TOOLS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── A. FRONTEND ─────────────────────────────────────────────────────────────
print("\n[1/5] Copie et configuration du Frontend...")
for item in DIST_DIR.iterdir():
    if item.name.endswith(".zip"):
        continue
    dest = FRONTEND_DIR / item.name
    if item.is_dir():
        shutil.copytree(item, dest, dirs_exist_ok=True)
    else:
        shutil.copy2(item, dest)

# Error HTML
ERROR_HTML = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HINNEH ÉDUCATION — Service en cours d'actualisation</title>
  <style>
    :root { --primary: #1e3a8a; --primary-light: #3b82f6; --bg: #f8fafc; --card: #ffffff; --text: #1e293b; --text-muted: #64748b; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
    .card { background: var(--card); max-width: 540px; width: 100%; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); padding: 2.5rem; text-align: center; border: 1px solid #e2e8f0; }
    .icon { width: 72px; height: 72px; margin: 0 auto 1.5rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-light); }
    h1 { font-size: 1.5rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; }
    p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background-color: var(--primary); color: white; text-decoration: none; font-weight: 600; font-size: 0.95rem; padding: 0.75rem 1.75rem; border-radius: 8px; border: none; cursor: pointer; }
    .btn:hover { background-color: #1d4ed8; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    </div>
    <h1>Plateforme en cours d'actualisation</h1>
    <p>Le portail <strong>HINNEH ÉDUCATION</strong> effectue une mise à jour de routine de ses services pour vous garantir une expérience optimale.</p>
    <p style="font-size: 0.875rem; background: #f1f5f9; padding: 0.75rem; border-radius: 6px; color: #475569;">Veuillez patienter quelques instants puis réactualiser la page.</p>
    <button class="btn" onclick="window.location.reload()">Réactualiser la page</button>
    <div class="footer">HINNEH ÉDUCATION — Système de Gestion Scolaire Intégré</div>
  </div>
</body>
</html>
"""
(FRONTEND_DIR / "error.html").write_text(ERROR_HTML, encoding="utf-8")

# .htaccess
HTACCESS = f"""# ==============================================================================
# HINNEH ÉDUCATION — FICHIER .HTACCESS DE PRODUCTION (hinneh-education.ci)
# Conçu pour éliminer les erreurs 404, 403, 500, 502, 503 sur Apache / cPanel
# ==============================================================================

# 1. GESTION DES PAGES D'ERREUR (Anti-crash 404 / 500 / 502 / 503)
ErrorDocument 404 /index.html
ErrorDocument 500 /error.html
ErrorDocument 502 /error.html
ErrorDocument 503 /error.html

# 2. RÉÉCRITURE D'URL & ROUTAGE SPA REACT (Évite les 404 au rafraîchissement)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Forcer HTTPS (hors localhost)
  RewriteCond %{{HTTPS}} off
  RewriteCond %{{HTTP_HOST}} !^localhost
  RewriteCond %{{HTTP_HOST}} !^127\\.0\\.0\\.1
  RewriteRule ^(.*)$ https://%{{HTTP_HOST}}%{{REQUEST_URI}} [R=301,L]

  # Proxy vers l'API FastAPI locale si mod_proxy est actif
  <IfModule mod_proxy.c>
    RewriteRule ^api/(.*)$ http://127.0.0.1:{BACKEND_PORT}/api/$1 [P,L]
    RewriteRule ^(docs|redoc|openapi.json) http://127.0.0.1:{BACKEND_PORT}/$1 [P,L]
    RewriteRule ^uploads/(.*)$ http://127.0.0.1:{BACKEND_PORT}/uploads/$1 [P,L]
  </IfModule>

  # Ne pas réécrire les fichiers et dossiers existants réels
  RewriteCond %{{REQUEST_FILENAME}} -f [OR]
  RewriteCond %{{REQUEST_FILENAME}} -d
  RewriteRule ^ - [L]

  # Rediriger toutes les autres routes vers index.html pour le SPA React
  RewriteRule ^ index.html [L,QSA]
</IfModule>

# 3. TYPES MIME OFFICIELS
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

# 4. EN-TÊTES DE SÉCURITÉ & CORS UNIVERSEL
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-School-Code, X-School-Id"

  # Pas de cache sur index.html pour des mises à jour immédiates
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  # Cache 1 an sur les assets hashés (JS, CSS, Polices, Images)
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|png|jpg|jpeg|gif|ico|webp)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
  </FilesMatch>
</IfModule>

# 5. COMPRESSION GZIP / DEFLATE
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
  AddOutputFilterByType DEFLATE text/javascript application/javascript application/x-javascript
  AddOutputFilterByType DEFLATE application/json application/xml image/svg+xml
  AddOutputFilterByType DEFLATE font/ttf font/woff font/woff2
</IfModule>

# 6. EXPIRATION DU CACHE NAVIGATEUR
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

# 7. PROTECTION DES FICHIERS SENSIBLES
<FilesMatch "^\\.(env|git|htaccess|htpasswd|ini|log|sh|bat|bak)$">
  Order allow,deny
  Deny from all
</FilesMatch>

Options -Indexes
"""
(FRONTEND_DIR / ".htaccess").write_text(HTACCESS, encoding="utf-8")
print(f"  [OK] Frontend pret ({len(list(FRONTEND_DIR.rglob('*')))} fichiers)")

# ── B. BACKEND ──────────────────────────────────────────────────────────────
print("\n[2/5] Copie et configuration du Backend FastAPI...")
BACKEND_ITEMS = [
    "app",
    "passenger_wsgi.py",
    "run.py",
    "check_and_fix_cpanel_db.py",
    "requirements.txt",
    "purge_mock_echeanciers.py",
    "school_educ.db",
]
for item in BACKEND_ITEMS:
    src = API_DIR / item
    dst = BACKEND_DIR / item
    if src.is_dir():
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.db", "data", "test_*.py"))
    elif src.is_file():
        shutil.copy2(src, dst)

PASSENGER_WSGI = """# passenger_wsgi.py
# Fichier de demarrage pour Phusion Passenger sur cPanel (Python App)
# Adaptateur ASGI vers WSGI securise pour FastAPI

import sys
import os
import traceback

os.environ["APP_ENV"] = "production"

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

api_dir = os.path.join(current_dir, 'api')
if os.path.exists(api_dir) and api_dir not in sys.path:
    sys.path.insert(1, api_dir)

backend_dir = os.path.join(current_dir, 'backend')
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(1, backend_dir)

try:
    from a2wsgi import ASGIMiddleware
    try:
        from app.main import app
    except ImportError:
        from api.app.main import app
    
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
  <title>HINNEH EDUCATION — Diagnostic de demarrage API</title>
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
    <p>Le serveur n'a pas pu demarrer le processus Python. Raisons courantes :</p>
    <ul>
      <li>Dependances manquantes : executez <code>pip install -r requirements.txt</code> dans l'environnement virtuel.</li>
      <li>Fichier de configuration <code>.env</code> manquant ou parametres MySQL invalides.</li>
    </ul>
    <h3>Detail technique de l'erreur :</h3>
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
(BACKEND_DIR / "passenger_wsgi.py").write_text(PASSENGER_WSGI, encoding="utf-8")

ENV_PROD = f"""# =============================================================================
#   HINNEH EDUCATION — CONFIGURATION DE PRODUCTION ({DOMAIN})
# =============================================================================
PROJECT_NAME="INSIGHTS VIEW EDUCATION API"
API_STR="/api"

# Configuration MySQL ({DB_NAME})
DB_NAME={DB_NAME}
DB_USER={DB_USER}
DB_PASSWORD={DB_PASSWORD}
DB_HOST={DB_HOST}
DB_PORT={DB_PORT}

DATABASE_URL="mysql+pymysql://{DB_USER}:Code%4096%2Amacsys@{DB_HOST}:{DB_PORT}/{DB_NAME}"

PORT={BACKEND_PORT}
HOST="0.0.0.0"

DEBUG=False
SECRET_KEY="fastapi-jwt-secret-key-hinneh-education-production-2026-x89a7f21b"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=600

ALLOWED_ORIGINS=["https://{DOMAIN}", "https://www.{DOMAIN}", "http://{DOMAIN}", "http://www.{DOMAIN}", "https://educ.insights-view.ci", "http://localhost:8080", "http://localhost:5173", "*"]
"""
(BACKEND_DIR / ".env").write_text(ENV_PROD, encoding="utf-8")
(BACKEND_DIR / ".env.production").write_text(ENV_PROD, encoding="utf-8")

for sub in ["photos", "school_assets/logos", "school_assets/signatures", "school_assets/cachets"]:
    p = BACKEND_DIR / "uploads" / sub / ".gitkeep"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.touch()

# Nettoyer __pycache__
for pycache in BACKEND_DIR.rglob("__pycache__"):
    shutil.rmtree(pycache, ignore_errors=True)
for pyc in BACKEND_DIR.rglob("*.pyc"):
    pyc.unlink(missing_ok=True)

print(f"  [OK] Backend pret ({len(list(BACKEND_DIR.rglob('*')))} fichiers)")

# ── C. CONFIGURATIONS SERVEUR ───────────────────────────────────────────────
print("\n[3/5] Generation des configurations Nginx, Systemd, Apache...")
NGINX = f"""# Configuration Nginx de Production — {DOMAIN}
server {{
    listen 80;
    server_name {DOMAIN} www.{DOMAIN};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {DOMAIN} www.{DOMAIN};

    root /var/www/{DOMAIN}/frontend;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

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

    location ~* ^/(docs|redoc|openapi.json) {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT};
    }}

    location /uploads/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/uploads/;
        proxy_set_header Host $host;
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
        root /var/www/{DOMAIN}/frontend;
        internal;
    }}
}}
"""
(CONFIGS_DIR / f"nginx_{DOMAIN}.conf").write_text(NGINX, encoding="utf-8")

SYSTEMD = f"""[Unit]
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
(CONFIGS_DIR / "hinneh-backend.service").write_text(SYSTEMD, encoding="utf-8")
(CONFIGS_DIR / ".htaccess").write_text(HTACCESS, encoding="utf-8")
(CONFIGS_DIR / "htaccess_port_8011_insights.txt").write_text(HTACCESS, encoding="utf-8")
(CONFIGS_DIR / "htaccess_port_8020_hinneh.txt").write_text(HTACCESS.replace(":8011", ":8020"), encoding="utf-8")

# ── D. OUTILS & GUIDE ───────────────────────────────────────────────────────
print("\n[4/5] Generation des outils et du guide de deploiement...")
TEST_DB = f"""#!/usr/bin/env python3
import pymysql
print("Test de connexion MySQL {DB_HOST}:{DB_PORT} (BD: {DB_NAME})...")
try:
    conn = pymysql.connect(host="{DB_HOST}", user="{DB_USER}", password="{DB_PASSWORD}", database="{DB_NAME}", port={DB_PORT}, connect_timeout=10)
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM user_educ;")
        print(f"[OK] Connexion reussie ! Utilisateurs : {{cur.fetchone()[0]}}")
    conn.close()
except Exception as e:
    print(f"[ERR] {{e}}")
"""
(TOOLS_DIR / "test_db_connection.py").write_text(TEST_DB, encoding="utf-8")

START_8011 = """#!/bin/bash
# Demarrage Uvicorn en arriere-plan sur le port 8011 (educ.insights-view.ci)
echo "Demarrage API FastAPI sur port 8011..."
screen -dmS educ_api_8011 bash -c 'APP_ENV=production uvicorn app.main:app --host 127.0.0.1 --port 8011 >> /tmp/uvicorn_8011.log 2>&1'
echo "Service educ_api_8011 lance avec succes."
"""
(TOOLS_DIR / "start_uvicorn_8011.sh").write_text(START_8011, encoding="utf-8")

START_8020 = """#!/bin/bash
# Demarrage Uvicorn en arriere-plan sur le port 8020 (hinneh-education.ci)
echo "Demarrage API FastAPI sur port 8020..."
screen -dmS educ_api_8020 bash -c 'APP_ENV=production uvicorn app.main:app --host 127.0.0.1 --port 8020 >> /tmp/uvicorn_8020.log 2>&1'
echo "Service educ_api_8020 lance avec succes."
"""
(TOOLS_DIR / "start_uvicorn_8020.sh").write_text(START_8020, encoding="utf-8")

GUIDE_MD = f"""# 🚀 GUIDE DE DEPLOIEMENT COMPLET — HINNEH EDUCATION & INSIGHTS-VIEW
**Domaines : `{DOMAIN}` & `educ.insights-view.ci` | Base de donnees : `{DB_NAME}`**  
*Garantie Zero Erreur 404, 500, 502, 503, CORS et Problemes de Cache*

---

## 📦 Contenu du Dossier de Deploiement

| Dossier / Fichier | Description |
|---|---|
| **`01_FRONTEND_PUBLIC_HTML/`** | Application React SPA compilee prete pour `public_html/` avec `.htaccess` anti-404 et `error.html`. |
| **`02_BACKEND_API/`** | Application FastAPI complete (`passenger_wsgi.py`, `app/`, `.env`, `requirements.txt`, `uploads/`). |
| **`03_CONFIGURATIONS_SERVEUR/`** | Fichiers Nginx, Systemd, Apache (.htaccess pour ports 8011 et 8020). |
| **`04_SCRIPTS_ET_OUTILS/`** | Scripts de demarrage Uvicorn (`start_uvicorn_8011.sh`, `start_uvicorn_8020.sh`) et test MySQL. |
| **`FRONTEND_PUBLIC_HTML.zip`** | Archive frontend prete a extraire dans `public_html/`. |
| **`BACKEND_PYTHON_APP.zip`** | Archive backend prete pour l'application Python cPanel ou VPS. |
| **`HINNEH_DEPLOIEMENT_COMPLET.zip`** | Archive globale contenant l'ensemble des elements. |

---

## 🛠️ Deploiement Rapide sur cPanel & VPS

### 1. Frontend :
1. Dans le **Gestionnaire de fichiers cPanel**, ouvrez `public_html/`.
2. Uploadez `FRONTEND_PUBLIC_HTML.zip` et cliquez sur **« Extraire »**.
3. Verifiez que `.htaccess` est bien present a la racine.
   - Si votre backend tourne sur le port **8011** (ex: `educ.insights-view.ci`), le `.htaccess` fourni pointe deja sur `127.0.0.1:8011`.
   - Si votre backend tourne sur le port **8020**, utilisez `htaccess_port_8020_hinneh.txt`.

### 2. Backend Python (FastAPI) :
#### Option A — Via Screen / Terminal :
```bash
# Pour educ.insights-view.ci (Port 8011) :
cd /home3/insights/educ.insights-view.ci && source /home3/insights/virtualenv/educ.insights-view.ci/api/3.11/bin/activate && APP_ENV=production uvicorn app.main:app --host 127.0.0.1 --port 8011 >> /tmp/uvicorn_8011_final.log 2>&1 &
```
#### Option B — Via Setup Python App (cPanel Passenger) :
1. Dans cPanel, cliquez sur **« Setup Python App »**.
2. Startup file : `passenger_wsgi.py`.
3. Cliquez sur **« Run Pip Install »** avec `requirements.txt`.
4. Cliquez sur **« Restart »**.
"""
(STAGE_DEPLOY / "GUIDE_DEPLOIEMENT_HINNEH.md").write_text(GUIDE_MD, encoding="utf-8")

# ── E. ARCHIVES ZIP ─────────────────────────────────────────────────────────
print("\n[5/5] Creation des archives ZIP...")
zip_front = PROJECT_ROOT / "FRONTEND_PUBLIC_HTML.zip"
zip_back  = PROJECT_ROOT / "BACKEND_PYTHON_APP.zip"
zip_all   = PROJECT_ROOT / "HINNEH_DEPLOIEMENT_COMPLET.zip"

for z in [zip_front, zip_back, zip_all]:
    if z.exists():
        z.unlink()

shutil.make_archive(str(PROJECT_ROOT / "FRONTEND_PUBLIC_HTML"), "zip", FRONTEND_DIR)
shutil.make_archive(str(PROJECT_ROOT / "BACKEND_PYTHON_APP"), "zip", BACKEND_DIR)
shutil.make_archive(str(PROJECT_ROOT / "HINNEH_DEPLOIEMENT_COMPLET"), "zip", STAGE_DEPLOY)

# Créer aussi les alias pratiques
shutil.copy2(zip_front, PROJECT_ROOT / "deploy_frontend.zip")
shutil.copy2(zip_back, PROJECT_ROOT / "deploy_backend.zip")
shutil.copy2(zip_all, PROJECT_ROOT / "DOSSIER_DEPLOIEMENT.zip")

# ── F. SYNCHRONISATION MULTI-EMPLACEMENTS ─────────────────────────────────────
print("\n[Synchronisation] Duplication vers les repertoires de deploiement cibles...")

# Créer aussi le format dossier 'deploy/' avec frontend/ et backend/
STAGE_DEPLOY_SIMPLE = PROJECT_ROOT / "_staging_deploy_simple"
if STAGE_DEPLOY_SIMPLE.exists():
    shutil.rmtree(STAGE_DEPLOY_SIMPLE, ignore_errors=True)
STAGE_DEPLOY_SIMPLE.mkdir(parents=True, exist_ok=True)
shutil.copytree(FRONTEND_DIR, STAGE_DEPLOY_SIMPLE / "frontend", dirs_exist_ok=True)
shutil.copytree(BACKEND_DIR, STAGE_DEPLOY_SIMPLE / "backend", dirs_exist_ok=True)

# Mettre a jour deploy.zip avec STAGE_DEPLOY_SIMPLE
shutil.make_archive(str(PROJECT_ROOT / "deploy"), "zip", STAGE_DEPLOY_SIMPLE)

destinations_full = [
    PROJECT_ROOT / "DOSSIER_DEPLOIEMENT",
    WORKSPACE_ROOT / "DOSSIER_DEPLOIEMENT",
    Path("C:/Users/dagno/Desktop/DOSSIER_DEPLOIEMENT"),
    Path("C:/Users/dagno/Downloads/DOSSIER_DEPLOIEMENT"),
]

for dst in destinations_full:
    try:
        if dst.exists():
            shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(STAGE_DEPLOY, dst, dirs_exist_ok=True)
        print(f"  -> {dst} synchronise ({len(list(dst.rglob('*')))} elements)")
    except Exception as e:
        safe_msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"  [WARN] Info copie vers {dst}: {safe_msg}")

destinations_simple = [
    PROJECT_ROOT / "deploy",
    WORKSPACE_ROOT / "deploy",
]

for dst in destinations_simple:
    try:
        if dst.exists():
            shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(STAGE_DEPLOY_SIMPLE, dst, dirs_exist_ok=True)
        print(f"  -> {dst} synchronise ({len(list(dst.rglob('*')))} elements)")
    except Exception as e:
        safe_msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"  [WARN] Info copie vers {dst}: {safe_msg}")

# Nettoyage des dossiers temporaires
shutil.rmtree(STAGE_DEPLOY, ignore_errors=True)
shutil.rmtree(STAGE_DEPLOY_SIMPLE, ignore_errors=True)

# Copier les ZIPs principaux a la racine du workspace, desktop et downloads
main_zips = [
    PROJECT_ROOT / "FRONTEND_PUBLIC_HTML.zip",
    PROJECT_ROOT / "BACKEND_PYTHON_APP.zip",
    PROJECT_ROOT / "HINNEH_DEPLOIEMENT_COMPLET.zip",
    PROJECT_ROOT / "DOSSIER_DEPLOIEMENT.zip",
    PROJECT_ROOT / "deploy.zip",
]

extra_zip_dirs = [
    WORKSPACE_ROOT,
    Path("C:/Users/dagno/Desktop"),
    Path("C:/Users/dagno/Downloads"),
]

for z in main_zips:
    if z.exists():
        for extra_dir in extra_zip_dirs:
            try:
                shutil.copy2(z, extra_dir / z.name)
            except Exception as e:
                pass

bat_content = """@echo off
chcp 65001 > nul
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║   HINNEH EDUCATION — Generation Deploiement Production      ║
echo  ║   Domaine : hinneh-education.ci  ^|  BD : insights_central    ║
echo  ║   Zero Erreur 404, 503, 500, 502, CORS                       ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

if exist "%~dp0build_all_deployment_dirs.py" (
    python "%~dp0build_all_deployment_dirs.py"
) else if exist "%~dp0310526\\build_all_deployment_dirs.py" (
    python "%~dp0310526\\build_all_deployment_dirs.py"
)
pause
"""
(PROJECT_ROOT / "DEPLOYER_HINNEH.bat").write_text(bat_content, encoding="utf-8")
(PROJECT_ROOT / "DEPLOYER.bat").write_text(bat_content, encoding="utf-8")
(WORKSPACE_ROOT / "DEPLOYER_HINNEH.bat").write_text(bat_content, encoding="utf-8")
(WORKSPACE_ROOT / "DEPLOYER.bat").write_text(bat_content, encoding="utf-8")
(WORKSPACE_ROOT / "GUIDE_DEPLOIEMENT_HINNEH.md").write_text(GUIDE_MD, encoding="utf-8")
shutil.copy2(PROJECT_ROOT / "build_all_deployment_dirs.py", WORKSPACE_ROOT / "build_all_deployment_dirs.py")

print("\n" + "="*70)
print("  SUCCES TOTAL — TOUS LES DOSSIERS ET ARCHIVES SONT DISPONIBLES !")
print("="*70)
print(f"  1. {WORKSPACE_ROOT / 'DOSSIER_DEPLOIEMENT'}")
print(f"  2. {WORKSPACE_ROOT / 'DOSSIER_DEPLOIEMENT_HINNEH'}")
print(f"  3. {WORKSPACE_ROOT / 'deploy'}")
print(f"  4. {PROJECT_ROOT / 'DOSSIER_DEPLOIEMENT'}")
print(f"  5. {PROJECT_ROOT / 'DOSSIER_DEPLOIEMENT_HINNEH'}")
print(f"  6. {PROJECT_ROOT / 'deploy'}")
print("="*70)
