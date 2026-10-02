# passenger_wsgi.py
# Fichier de démarrage pour Phusion Passenger sur cPanel (Python App)

import sys
import os
import traceback

# ── 1. Signaler à l'application qu'on est en PRODUCTION ──────────────────────
os.environ["APP_ENV"] = "production"

# ── 2. Ajouter les dossiers au chemin Python ──────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
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

