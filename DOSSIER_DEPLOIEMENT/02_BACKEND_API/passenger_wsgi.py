# passenger_wsgi.py
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
            f.write(f"\n--- ERREUR DE DEMARRAGE PASSENGER ---\n{err_trace}\n")
    except Exception:
        pass

    def application(environ, start_response):
        status = '500 Internal Server Error'
        output = f"""<!DOCTYPE html>
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
</html>""".encode('utf-8')
        response_headers = [
            ('Content-type', 'text/html; charset=utf-8'),
            ('Content-Length', str(len(output)))
        ]
        start_response(status, response_headers)
        return [output]
