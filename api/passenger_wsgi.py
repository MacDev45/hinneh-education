# passenger_wsgi.py
# Fichier de démarrage pour Phusion Passenger sur cPanel (Python App)
# Ce fichier doit être à la racine du dossier de votre application Python sur cPanel

import sys
import os
import traceback

# ── 1. Signaler à l'application qu'on est en PRODUCTION ──────────────────────
os.environ["APP_ENV"] = "production"
db_name = os.environ.get("DB_NAME", "insights_test")
db_user = os.environ.get("DB_USER", "insights_dbuser")
db_pass = os.environ.get("DB_PASSWORD", "Code@96*macsys")
db_host = os.environ.get("DB_HOST", "10.10.10.100")
db_port = os.environ.get("DB_PORT", "3306")

os.environ["DB_NAME"] = db_name
os.environ["DB_USER"] = db_user
os.environ["DB_PASSWORD"] = db_pass
os.environ["DB_HOST"] = db_host
os.environ["DB_PORT"] = db_port
os.environ["DATABASE_URL"] = f"mysql+pymysql://{db_user}:Code%4096%2Amacsys@{db_host}:{db_port}/{db_name}"

# ── 2. Ajouter les dossiers au chemin Python ──────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(1, parent_dir)

# ── 3. Initialisation de l'application avec capture d'erreurs ────────────────
try:
    from a2wsgi import ASGIMiddleware
    from app.main import app
    application = ASGIMiddleware(app)
except Exception as e:
    err_trace = traceback.format_exc()
    log_file = os.path.join(current_dir, "passenger_startup_error.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\n--- ERREUR DE DEMARRAGE PASSENGER ---\n{err_trace}\n")
    except Exception:
        pass

    def application(environ, start_response):
        status = '500 Internal Server Error'
        output = f"""<html>
<head><title>Erreur de démarrage Backend</title></head>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>Erreur lors du chargement de l'application FastAPI</h2>
  <p>Vérifiez que toutes les dépendances sont installées via <code>pip install -r requirements.txt</code> et que le fichier <code>.env</code> est configuré.</p>
  <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; border: 1px solid #ccc; overflow-x: auto;">{err_trace}</pre>
</body>
</html>""".encode('utf-8')
        response_headers = [
            ('Content-type', 'text/html; charset=utf-8'),
            ('Content-Length', str(len(output)))
        ]
        start_response(status, response_headers)
        return [output]

