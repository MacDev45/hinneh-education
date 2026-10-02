import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'school_educ.db')
    print(f"Connecting to SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Vérifier / Mettre à jour api_car
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_car'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(api_car)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        print(f"Colonnes existantes dans api_car: {existing_cols}")

        columns_to_add = [
            ("type_vehicule", "VARCHAR(50) DEFAULT 'Bus'"),
            ("compagnie_assurance", "VARCHAR(100)"),
            ("num_police_assurance", "VARCHAR(100)"),
            ("date_expiration_assurance", "DATE"),
            ("date_derniere_visite_technique", "DATE"),
            ("date_expiration_visite_technique", "DATE"),
            ("num_carte_stationnement", "VARCHAR(100)"),
            ("date_expiration_stationnement", "DATE"),
            ("kilometrage_actuel", "INTEGER DEFAULT 0"),
            ("carburant", "VARCHAR(50) DEFAULT 'Gasoil'"),
            ("annee_mise_en_service", "INTEGER"),
            ("prochaine_vidange_km", "INTEGER DEFAULT 5000"),
            ("notes", "TEXT"),
            ("ET_CODEETABLISSEMENT", "VARCHAR(50)"),
            ("ecole_id", "INTEGER")
        ]

        for col_name, col_def in columns_to_add:
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE api_car ADD COLUMN {col_name} {col_def}")
                    print(f"  + Colonne ajoutée à api_car : {col_name}")
                except Exception as e:
                    print(f"  ! Erreur ajout {col_name} : {e}")
        conn.commit()

    # 2. Créer table api_entretienvehicule si manquante
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_entretienvehicule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicule_id INTEGER,
            immatriculation VARCHAR(50),
            type_intervention VARCHAR(100) NOT NULL,
            date_intervention DATE NOT NULL,
            kilometrage INTEGER DEFAULT 0,
            prochain_kilometrage INTEGER,
            garage_prestataire VARCHAR(150),
            cout_total NUMERIC(12, 2) DEFAULT 0.00,
            facture_ref VARCHAR(100),
            description TEXT,
            statut VARCHAR(50) DEFAULT 'termine',
            ET_CODEETABLISSEMENT VARCHAR(50),
            ecole_id INTEGER
        )
    """)
    conn.commit()
    print("  + Table api_entretienvehicule vérifiée/créée.")

    # 3. Créer table api_parcautoagent si manquante
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_parcautoagent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER,
            nom_prenoms VARCHAR(200) NOT NULL,
            telephone VARCHAR(50),
            role_mission VARCHAR(100) DEFAULT 'Conducteur',
            vehicule_attribue_id INTEGER,
            immatriculation_vehicule VARCHAR(50),
            num_permis VARCHAR(100),
            categories_permis VARCHAR(50),
            date_validite_permis DATE,
            num_carte_stationnement VARCHAR(100),
            visite_medicale_date DATE,
            statut_medical VARCHAR(50) DEFAULT 'apte',
            statut VARCHAR(50) DEFAULT 'actif',
            notes TEXT,
            ET_CODEETABLISSEMENT VARCHAR(50),
            ecole_id INTEGER
        )
    """)
    conn.commit()
    print("  + Table api_parcautoagent vérifiée/créée.")

    conn.close()
    print("Migration du Parc Automobile terminée avec succès !")

if __name__ == '__main__':
    migrate()
