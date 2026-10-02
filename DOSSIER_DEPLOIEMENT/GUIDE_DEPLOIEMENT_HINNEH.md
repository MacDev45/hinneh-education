# 🚀 GUIDE DE DEPLOIEMENT COMPLET — HINNEH EDUCATION & INSIGHTS-VIEW
**Domaines : `hinneh-education.ci` & `educ.insights-view.ci` | Base de donnees : `insights_central`**  
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
