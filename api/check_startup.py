#!/usr/bin/env python3
"""
check_startup.py — Script de diagnostic cPanel pour HINNEH ÉDUCATION
Exécuter dans le terminal cPanel (SSH ou Python console) :
    python check_startup.py

Vérifie :
  1. Version Python
  2. Dépendances installées
  3. Connexion MySQL
  4. Chargement de l'application FastAPI
"""
import sys
import os

print("=" * 60)
print("  HINNEH ÉDUCATION — Diagnostic de démarrage")
print("=" * 60)

# 1. Python
print(f"\n✅ Python : {sys.version}")
print(f"   Chemin  : {sys.executable}")

# 2. Répertoire de travail
cwd = os.getcwd()
script_dir = os.path.dirname(os.path.abspath(__file__))
print(f"\n📁 Répertoire script : {script_dir}")
print(f"   CWD              : {cwd}")

# 3. Vérifier le .env
env_file = os.path.join(script_dir, ".env")
env_prod  = os.path.join(script_dir, ".env.production")
print(f"\n📄 Fichiers .env :")
print(f"   .env            : {'✅ présent' if os.path.exists(env_file) else '❌ ABSENT'}")
print(f"   .env.production : {'✅ présent' if os.path.exists(env_prod) else '❌ ABSENT'}")

# 4. Dépendances
MODULES = [
    ("fastapi",           "FastAPI"),
    ("uvicorn",           "Uvicorn"),
    ("sqlalchemy",        "SQLAlchemy"),
    ("pydantic_settings", "Pydantic-settings"),
    ("pymysql",           "PyMySQL"),
    ("a2wsgi",            "a2wsgi (Passenger)"),
    ("passlib",           "Passlib"),
    ("jose",              "python-jose"),
    ("multipart",         "python-multipart"),
    ("openpyxl",          "OpenPyXL"),
    ("httpx",             "HTTPX"),
    ("qrcode",            "QRCode"),
    ("PIL",               "Pillow"),
]

print("\n📦 Dépendances :")
missing = []
for mod, label in MODULES:
    try:
        __import__(mod)
        print(f"   ✅ {label}")
    except ImportError as e:
        print(f"   ❌ {label} — MANQUANT ({e})")
        missing.append(label)

if missing:
    print(f"\n⚠️  {len(missing)} dépendance(s) manquante(s) !")
    print("   Exécutez dans votre venv :")
    print("   pip install -r requirements.txt")

# 5. Connexion MySQL
print("\n🗄️  Connexion MySQL :")
try:
    import pymysql
    db_params = {}
    for f in [env_file, env_prod]:
        if os.path.exists(f):
            with open(f) as fh:
                for line in fh:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        db_params[k.strip()] = v.strip().strip('"').strip("'")
            break

    host = db_params.get("DB_HOST", "10.10.10.100")
    user = db_params.get("DB_USER", "insights_dbuser")
    pwd  = db_params.get("DB_PASSWORD", "")
    db   = db_params.get("DB_NAME", "insights_central")
    port = int(db_params.get("DB_PORT", 3306))

    print(f"   Host : {host}:{port}")
    print(f"   User : {user}")
    print(f"   DB   : {db}")

    conn = pymysql.connect(host=host, user=user, password=pwd, database=db, port=port, connect_timeout=5)
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    cursor.execute("SHOW TABLES")
    tables = [r[0] for r in cursor.fetchall()]
    conn.close()
    print(f"   ✅ Connexion OK — {len(tables)} table(s)")
    for t in tables[:10]:
        print(f"      · {t}")
    if len(tables) > 10:
        print(f"      … et {len(tables)-10} autres")

except Exception as e:
    print(f"   ❌ ÉCHEC — {e}")
    print("   → Vérifiez DB_HOST, DB_USER, DB_PASSWORD, DB_NAME dans .env")

# 6. Import de l'application
print("\n🚀 Chargement de l'application FastAPI :")
sys.path.insert(0, script_dir)
try:
    from app.main import app
    print(f"   ✅ App chargée — {len(app.routes)} route(s)")
except Exception as e:
    import traceback
    print(f"   ❌ ÉCHEC : {e}")
    print(traceback.format_exc())

print("\n" + "=" * 60)
print("  Diagnostic terminé")
print("=" * 60)
