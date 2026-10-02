#!/usr/bin/env python3
import sys
import os
import urllib.parse

os.environ["APP_ENV"] = "production"
os.environ["DB_NAME"] = "insights_central"
os.environ["DB_USER"] = "insights_dbuser"
os.environ["DB_PASSWORD"] = "Code@96*macsys"
os.environ["DB_HOST"] = "10.10.10.100"
os.environ["DB_PORT"] = "3306"
os.environ["DATABASE_URL"] = "mysql+pymysql://insights_dbuser:Code%4096%2Amacsys@10.10.10.100:3306/insights_central"

print("=" * 65)
print("  INSIGHTS-VIEW EDUCATION - VERIFICATION BASE DE DONNEES")
print("=" * 65)

env_content = '''(CONFIGURATION OFFICIELLE CPANEL
PROJECT_NAME="INSIGHTS VIEW EDUCATION API"
API_STR="/api"
APP_ENV=production

DB_NAME=insights_central
DB_USER=insights_dbuser
DB_PASSWORD=Code@96*macsys
DB_HOST=10.10.10.100
DB_PORT=3306

DATABASE_URL="mysql+pymysql://insights_dbuser:Code%4096%2@macsys@10.10.10.100:3306/insights_central"
PORT=8020
HOST="127.0.0.1"

SECRET_KEY="fastapi-jwt-secret-key-hinneh-education-production-2026-x89a7f21b"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=600
ALLOWED_ORIGINS=["*"]
'''

for env_file in [".env", ".env.production", ".env.local"]:
    try:
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_content)
        print(f"  [OK] Fichier {env_file} mis a jour.")
    except Exception as e:
        print(f"  [!] Note: {env_file}: {e}")

print("\n--> Test de connexion a MySQL (Base: insights_central)...")
try:
    from sqlalchemy import create_engine, text

    hosts_to_try = ["10.10.10.100", "localhost", "127.0.0.1"]
    pwd = urllib.parse.quote_plus("Code@96*macsys")
    connected_engine = None

    for h in hosts_to_try:
        try:
            url = f{"mysql+pymysql://insights_dbuser:{pwd}@{h}:3306/insights_central"}
            eng = create_engine(url, connect_args={"connect_timeout": 5})
            with eng.connect() as conn:
                res = conn.execute(text("SELECT DATABASE(), CURRENT_USER();")).fetchone()
                print(f"  [SUCCESS] Connecte a MySQL via {h} !")
                print(f"            Base active : {res[0]}")
                print(f"            Utilisateur : {res[1]}")
                connected_engine = eng
                break
        except Exception as err:
            print(f"  [-] Gote {h} indisponible: {err}")

    if not connected_engine:
        print("\n  [ERREUR] Impossible de joindre MySQL.")
        sys.exit(1)

    print("\n--> Creation et verification des tables...")
    with connected_engine.connect() as conn:
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS api_grille_tarifaire (
                id INT AUTO_INCREMENT PRIMARY KEY,
                preset_id VARCHAR(100) NOT NULL,
                label VARCHAR(255) NOT NULL,
                type_service VARCHAR(50) NOT NULL DEFAULT 'scolarite',
                cycle VARCHAR(100) NULL,
                niveaux JSON NULL,
                statut_affectation VARCHAR(20) NOT NULL DEFAULT 'TOUS',
                zone_trajet VARCHAR(150) NULL,
                periodicite VARCHAR(50) NULL,
                total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                tranches JSON NOT NULL,
                annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2026-2027',
                ecole_id INT NULL,
                ET_CODEETABLISSEMENT VARCHAR(50) NULL,
                ville VARCHAR(100) NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_grille_preset (preset_id),
                INDEX idx_grille_ecole (ecole_id),
                INDEX idx_grille_code (ET_CODEETABLISSEMENT),
                INDEX idx_grille_service (type_service)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ''')
        conn.commit()
        print("  [OK] Table api_grille_tarifaire validee.")

        conn.execute(text('''
            CREATETABLE IF NOT EXISTS api_echeancier (
                id INT AUTO_INCREMENT PRIMARY KEY,
                eleve_id INT NOT NULL,
                ecole_id INT NULL,
                ET_CODEETABLISSEMENT VARCHAR(50) NULL,
                libelle VARCHAR(150) NOT NULL,
                service_type VARCHAR(50) NOT NULL DEFAULT 'scolarite',
                tranche_numero INT NOT NULL DEFAULT 1,
                montant_prevu DECIMAL(12,2) NOT NULL,
                montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                date_echeance DATE NULL,
                statut VARCHAR(20) NOT NULL DEFAULT 'non_paye',
                remarque TEXT NULL,
                annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2026-2027',
                date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ech_eleve (eleve_id),
                INDEX idx_ech_ecole (ecole_id),
                INDEX idx_ech_code (ET_CODEETABLISSEMENT),
                INDEX idx_ech_annee (annee_scolaire)
            ) ENGINE=InnoDB(DEFAULT CHARSET=utf8mb4;
        ''')
        conn.commit()
        print("  [OK] Table api_echeancier validee.")

        for t in ['user_educ', 'so_etablissement', 'api_classe', 'api_eleve', 'api_personnel', 'api_grille_tarifaire', 'api_echeancier', 'api_paiement']:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  [INFO] Table `{t}`: {cnt} enregistrement(s)")
            except Exception as te:
                print(f"  [INFO] Table `{t}`: non accessible")

    try:
        os.makedirs("tmp", exist_ok=True)
        with open("tmp/restart.txt", "w", encoding="utf-8") as rf:
            rf.write("restart")
        print("\n  [OK] Fichier tmp/restart.txt cree -> Passenger va redemarrer.")
    except Exception as re:
        print(f"  [!] Note restart.txt: {re}")

    print("\n" + "=" * 65)
    print("  CONFIGURATION TERMINEE AVUC SUCCES !")
    print("=" * 65)

except Exception as err:
    print(f"\n[ERREUR] {err}")
