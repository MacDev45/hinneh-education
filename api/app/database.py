import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings, BACKEND_ROOT

def _auto_migrate_schema(eng):
    try:
        from sqlalchemy import inspect, text
        with eng.connect() as conn:
            inspector = inspect(eng)
            tables = inspector.get_table_names()
            is_sqlite = eng.dialect.name == "sqlite"
            if 'so_etablissement' in tables:
                if is_sqlite:
                    try:
                        res = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='so_etablissement'")).fetchone()
                        if res and res[0] and ("UNIQUE" in res[0] or "PRIMARY KEY" not in res[0]):
                            conn.execute(text("""
                                CREATE TABLE IF NOT EXISTS so_etablissement_v2 (
                                    IDETABLISSEMENT INTEGER PRIMARY KEY AUTOINCREMENT,
                                    ET_DENOMMINATION VARCHAR(255) NOT NULL,
                                    ET_CODEETABLISSEMENT VARCHAR(50),
                                    ET_REGION VARCHAR(100),
                                    ET_VILLE VARCHAR(100),
                                    ET_ADRESSE_POSTALE TEXT,
                                    ET_CONTACTS VARCHAR(50),
                                    ET_EMAIL VARCHAR(254),
                                    ET_CYCLES JSON,
                                    ET_STATUT VARCHAR(20) DEFAULT 'actif',
                                    ET_EFFECTIF_CLASSE INTEGER DEFAULT 0,
                                    ET_NOMBRECLASSES INTEGER DEFAULT 0,
                                    ET_NOMBREPERSONNEL INTEGER DEFAULT 0,
                                    ET_SCOREPERFORMANCE FLOAT DEFAULT 0.0,
                                    ET_TAUXPRESENCE FLOAT DEFAULT 0.0,
                                    ET_TAUXRECOUVREMENT FLOAT DEFAULT 0.0,
                                    LOGO TEXT,
                                    ET_DATECREATION DATETIME
                                );
                            """))
                            conn.execute(text("""
                                INSERT INTO so_etablissement_v2 (
                                    IDETABLISSEMENT, ET_DENOMMINATION, ET_CODEETABLISSEMENT, ET_REGION, ET_VILLE,
                                    ET_ADRESSE_POSTALE, ET_CONTACTS, ET_EMAIL, ET_CYCLES, ET_STATUT,
                                    ET_EFFECTIF_CLASSE, ET_NOMBRECLASSES, ET_NOMBREPERSONNEL, ET_SCOREPERFORMANCE,
                                    ET_TAUXPRESENCE, ET_TAUXRECOUVREMENT, LOGO, ET_DATECREATION
                                )
                                SELECT 
                                    IDETABLISSEMENT, ET_DENOMMINATION, ET_CODEETABLISSEMENT, ET_REGION, ET_VILLE,
                                    ET_ADRESSE_POSTALE, ET_CONTACTS, ET_EMAIL, ET_CYCLES, ET_STATUT,
                                    ET_EFFECTIF_CLASSE, ET_NOMBRECLASSES, ET_NOMBREPERSONNEL, ET_SCOREPERFORMANCE,
                                    ET_TAUXPRESENCE, ET_TAUXRECOUVREMENT, LOGO, ET_DATECREATION
                                FROM so_etablissement;
                            """))
                            conn.execute(text("DROP TABLE so_etablissement;"))
                            conn.execute(text("ALTER TABLE so_etablissement_v2 RENAME TO so_etablissement;"))
                            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_so_etablissement_IDETABLISSEMENT ON so_etablissement (IDETABLISSEMENT);"))
                            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_etablissement_code ON so_etablissement (ET_CODEETABLISSEMENT);"))
                            conn.commit()
                    except Exception as e_sq:
                        pass
                else:
                    try:
                        conn.execute(text('ALTER TABLE so_etablissement DROP INDEX ET_CODEETABLISSEMENT;'))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text('ALTER TABLE so_etablissement DROP INDEX uq_so_etablissement_ET_CODEETABLISSEMENT;'))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text('ALTER TABLE so_etablissement DROP INDEX ix_so_etablissement_ET_CODEETABLISSEMENT;'))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text('CREATE INDEX idx_etablissement_code ON so_etablissement (ET_CODEETABLISSEMENT);'))
                        conn.commit()
                    except Exception:
                        pass
            if 'api_cycle' in tables:
                try:
                    conn.execute(text('ALTER TABLE api_cycle DROP INDEX code;'))
                    conn.commit()
                except Exception:
                    pass
            if 'api_niveau' in tables:
                try:
                    conn.execute(text('ALTER TABLE api_niveau DROP INDEX code;'))
                    conn.commit()
                except Exception:
                    pass
            if 'api_matiere' in tables:
                try:
                    conn.execute(text('ALTER TABLE api_matiere DROP INDEX code;'))
                    conn.commit()
                except Exception:
                    pass
            if 'user_educ' in tables:
                cols = [c['name'] for c in inspector.get_columns('user_educ')]
                if 'villes_autorisees' not in cols:
                    conn.execute(text('ALTER TABLE user_educ ADD COLUMN villes_autorisees TEXT;'))
                    conn.commit()
                if 'ecoles_autorisees' not in cols:
                    conn.execute(text('ALTER TABLE user_educ ADD COLUMN ecoles_autorisees TEXT;'))
                    conn.commit()
                if 'ville' not in cols:
                    conn.execute(text('ALTER TABLE user_educ ADD COLUMN ville TEXT;'))
                    conn.commit()
                if 'PROFIL' not in cols:
                    conn.execute(text('ALTER TABLE user_educ ADD COLUMN PROFIL VARCHAR(100);'))
                    conn.commit()
                if 'ET_CODEETABLISSEMENT' not in cols:
                    conn.execute(text('ALTER TABLE user_educ ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);'))
                    conn.commit()
            if 'api_car' in tables:
                car_cols = [c['name'] for c in inspector.get_columns('api_car')]
                if 'chauffeur_id' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN chauffeur_id INTEGER;'))
                    conn.commit()
                if 'ligne_id' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN ligne_id INTEGER;'))
                    conn.commit()
                if 'ligne_nom' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN ligne_nom TEXT;'))
                    conn.commit()
                if 'type_vehicule' not in car_cols:
                    conn.execute(text("ALTER TABLE api_car ADD COLUMN type_vehicule VARCHAR(50) DEFAULT 'Bus';"))
                    conn.commit()
                if 'compagnie_assurance' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN compagnie_assurance VARCHAR(100);'))
                    conn.commit()
                if 'num_police_assurance' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN num_police_assurance VARCHAR(100);'))
                    conn.commit()
                if 'date_expiration_assurance' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN date_expiration_assurance DATE;'))
                    conn.commit()
                if 'date_derniere_visite_technique' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN date_derniere_visite_technique DATE;'))
                    conn.commit()
                if 'date_expiration_visite_technique' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN date_expiration_visite_technique DATE;'))
                    conn.commit()
                if 'num_carte_stationnement' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN num_carte_stationnement VARCHAR(100);'))
                    conn.commit()
                if 'date_expiration_stationnement' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN date_expiration_stationnement DATE;'))
                    conn.commit()
                if 'kilometrage_actuel' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN kilometrage_actuel INTEGER DEFAULT 0;'))
                    conn.commit()
                if 'carburant' not in car_cols:
                    conn.execute(text("ALTER TABLE api_car ADD COLUMN carburant VARCHAR(50) DEFAULT 'Gasoil';"))
                    conn.commit()
                if 'annee_mise_en_service' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN annee_mise_en_service INTEGER;'))
                    conn.commit()
                if 'prochaine_vidange_km' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN prochaine_vidange_km INTEGER DEFAULT 5000;'))
                    conn.commit()
                if 'notes' not in car_cols:
                    conn.execute(text('ALTER TABLE api_car ADD COLUMN notes TEXT;'))
                    conn.commit()
            if 'api_personnel' in tables:
                pers_cols = [c['name'] for c in inspector.get_columns('api_personnel')]
                if 'is_groupe_strategique' not in pers_cols:
                    conn.execute(text('ALTER TABLE api_personnel ADD COLUMN is_groupe_strategique BOOLEAN DEFAULT 0;'))
                    conn.commit()
                if 'date_nomination_strategique' not in pers_cols:
                    conn.execute(text('ALTER TABLE api_personnel ADD COLUMN date_nomination_strategique DATETIME;'))
                    conn.commit()
                if 'nomme_par' not in pers_cols:
                    conn.execute(text('ALTER TABLE api_personnel ADD COLUMN nomme_par VARCHAR(150);'))
                    conn.commit()
            if 'api_eleve' in tables:
                eleve_cols = [c['name'] for c in inspector.get_columns('api_eleve')]
                if 'is_fraterie' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN is_fraterie BOOLEAN DEFAULT 0;'))
                    conn.commit()
                if 'rang_fraterie' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN rang_fraterie INTEGER DEFAULT 1;'))
                    conn.commit()
                if 'parent_whatsapp' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN parent_whatsapp VARCHAR(50);'))
                    conn.commit()
                if 'parent_nom_complet' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN parent_nom_complet VARCHAR(200);'))
                    conn.commit()
                if 'parent_personnel_id' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN parent_personnel_id INTEGER;'))
                    conn.commit()
                if 'reduction_type_appliquee' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN reduction_type_appliquee VARCHAR(50);'))
                    conn.commit()
                if 'reduction_taux_applique' not in eleve_cols:
                    conn.execute(text('ALTER TABLE api_eleve ADD COLUMN reduction_taux_applique FLOAT DEFAULT 0.0;'))
                    conn.commit()
            if 'api_niveau' in tables:
                niv_cols = [c['name'] for c in inspector.get_columns('api_niveau')]
                if 'ET_CODEETABLISSEMENT' not in niv_cols:
                    conn.execute(text('ALTER TABLE api_niveau ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);'))
                    conn.commit()
            if 'api_attributionmatiere' in tables:
                if is_sqlite:
                    try:
                        res = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='api_attributionmatiere'")).fetchone()
                        if res and res[0] and "enseignant_id INTEGER NOT NULL" in res[0]:
                            conn.execute(text("""
                                CREATE TABLE IF NOT EXISTS api_attributionmatiere_v2 (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    statut VARCHAR(20) NOT NULL DEFAULT 'actif',
                                    jour VARCHAR(20) NOT NULL,
                                    heure VARCHAR(50) NOT NULL,
                                    salle VARCHAR(50),
                                    classe_id INTEGER NOT NULL,
                                    enseignant_id INTEGER NULL,
                                    matiere_id INTEGER NOT NULL,
                                    groupe VARCHAR(50) DEFAULT 'Classe entière',
                                    ET_CODEETABLISSEMENT VARCHAR(50),
                                    ajoutele DATETIME,
                                    modifierle DATETIME,
                                    idUser BIGINT,
                                    ecole_id INT NULL
                                );
                            """))
                            conn.execute(text("""
                                INSERT INTO api_attributionmatiere_v2 (
                                    id, statut, jour, heure, salle, classe_id, enseignant_id, matiere_id, groupe, ET_CODEETABLISSEMENT, ajoutele, modifierle, idUser, ecole_id
                                )
                                SELECT 
                                    id, statut, jour, heure, salle, classe_id, enseignant_id, matiere_id, groupe, ET_CODEETABLISSEMENT, ajoutele, modifierle, idUser, ecole_id
                                FROM api_attributionmatiere;
                            """))
                            conn.execute(text("DROP TABLE api_attributionmatiere;"))
                            conn.execute(text("ALTER TABLE api_attributionmatiere_v2 RENAME TO api_attributionmatiere;"))
                            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_api_attributionmatiere_id ON api_attributionmatiere (id);"))
                            conn.commit()
                    except Exception as e_attr:
                        print(f"Table api_attributionmatiere migration notice: {e_attr}")
                    try:
                        conn.execute(text("ALTER TABLE api_attributionmatiere MODIFY COLUMN enseignant_id INT NULL;"))
                        conn.commit()
                    except Exception:
                        pass
            if 'api_evaluation' in tables:
                eval_cols = [c['name'] for c in inspector.get_columns('api_evaluation')]
                if 'annee_scolaire' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN annee_scolaire VARCHAR(20);'))
                    conn.commit()
                if 'semestre' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN semestre INTEGER;'))
                    conn.commit()
                if 'transfert_id' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN transfert_id INTEGER;'))
                    conn.commit()
                if 'ville_origine' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN ville_origine VARCHAR(100);'))
                    conn.commit()
                if 'ecole_origine_id' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN ecole_origine_id INTEGER;'))
                    conn.commit()
                if 'code_etablissement_origine' not in eval_cols:
                    conn.execute(text('ALTER TABLE api_evaluation ADD COLUMN code_etablissement_origine VARCHAR(50);'))
                    conn.commit()

            if 'api_transfert_notes' not in tables:
                try:
                    if is_sqlite:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_transfert_notes (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                date_transfert DATETIME DEFAULT CURRENT_TIMESTAMP,
                                annee_scolaire VARCHAR(20) NOT NULL,
                                type_periode VARCHAR(20) NOT NULL DEFAULT 'trimestre',
                                periode_numero INTEGER NOT NULL DEFAULT 1,
                                ville_source VARCHAR(100) NOT NULL,
                                ecole_source_id INTEGER,
                                nom_ecole_source VARCHAR(255),
                                ecole_destination_id INTEGER NOT NULL,
                                nom_ecole_destination VARCHAR(255),
                                code_etablissement_destination VARCHAR(50) NOT NULL,
                                nombre_notes INTEGER DEFAULT 0,
                                nombre_eleves INTEGER DEFAULT 0,
                                nombre_classes INTEGER DEFAULT 0,
                                moyenne_generale_transfert FLOAT,
                                statut VARCHAR(30) DEFAULT 'effectue',
                                effectue_par VARCHAR(150),
                                effectue_par_nom VARCHAR(150),
                                motif TEXT,
                                notes_ids TEXT,
                                snapshot_origine TEXT,
                                details TEXT,
                                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                                date_annulation DATETIME,
                                annule_par VARCHAR(150),
                                motif_annulation TEXT
                            );
                        """))
                        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_api_transfert_notes_id ON api_transfert_notes (id);"))
                        conn.commit()
                    else:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_transfert_notes (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                date_transfert DATETIME DEFAULT CURRENT_TIMESTAMP,
                                annee_scolaire VARCHAR(20) NOT NULL,
                                type_periode VARCHAR(20) NOT NULL DEFAULT 'trimestre',
                                periode_numero INT NOT NULL DEFAULT 1,
                                ville_source VARCHAR(100) NOT NULL,
                                ecole_source_id INT NULL,
                                nom_ecole_source VARCHAR(255) NULL,
                                ecole_destination_id INT NOT NULL,
                                nom_ecole_destination VARCHAR(255) NULL,
                                code_etablissement_destination VARCHAR(50) NOT NULL,
                                nombre_notes INT DEFAULT 0,
                                nombre_eleves INT DEFAULT 0,
                                nombre_classes INT DEFAULT 0,
                                moyenne_generale_transfert FLOAT NULL,
                                statut VARCHAR(30) DEFAULT 'effectue',
                                effectue_par VARCHAR(150) NULL,
                                effectue_par_nom VARCHAR(150) NULL,
                                motif TEXT NULL,
                                notes_ids JSON NULL,
                                snapshot_origine JSON NULL,
                                details JSON NULL,
                                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                                date_annulation DATETIME NULL,
                                annule_par VARCHAR(150) NULL,
                                motif_annulation TEXT NULL,
                                INDEX idx_transfert_annee (annee_scolaire),
                                INDEX idx_transfert_ville (ville_source)
                            );
                        """))
                        conn.commit()
                except Exception as e_tn:
                    print(f"Table api_transfert_notes migration notice: {e_tn}")

            # Recalcul automatique des soldes de scolarité pour isoler strictement la scolarité de la cantine et du transport
            if 'api_eleve' in tables and 'api_paiement' in tables:
                try:
                    conn.execute(text("""
                        UPDATE api_eleve 
                        SET AU_TOTALDEPOT = COALESCE((
                            SELECT SUM(montant) FROM api_paiement 
                            WHERE api_paiement.eleve_id = api_eleve.id 
                            AND api_paiement.type IN ('scolarite', 'frais_inscription', 'frais_annexe', 'inscription', 'reinscription')
                            AND api_paiement.statut != 'annule'
                        ), 0)
                    """))
                    conn.execute(text("""
                        UPDATE api_eleve 
                        SET AU_SOLDECOMPTE = CASE 
                            WHEN COALESCE(AU_SCOLARITE, 0) - COALESCE(AU_TOTALDEPOT, 0) > 0 
                            THEN COALESCE(AU_SCOLARITE, 0) - COALESCE(AU_TOTALDEPOT, 0) 
                            ELSE 0 
                        END
                    """))
                    conn.commit()
                except Exception as e_recalc:
                    print(f"Migration balance recalculation note: {e_recalc}")

            # Création garantie des tables métiers si absentes
            if 'api_grille_tarifaire' not in tables:
                try:
                    if is_sqlite:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_grille_tarifaire (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                preset_id VARCHAR(100) NOT NULL,
                                label VARCHAR(255) NOT NULL,
                                type_service VARCHAR(50) NOT NULL DEFAULT 'scolarite',
                                cycle VARCHAR(100),
                                niveaux TEXT,
                                statut_affectation VARCHAR(20) NOT NULL DEFAULT 'TOUS',
                                zone_trajet VARCHAR(150),
                                periodicite VARCHAR(50),
                                total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                                tranches TEXT NOT NULL,
                                annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2026-2027',
                                ecole_id INTEGER,
                                ET_CODEETABLISSEMENT VARCHAR(50),
                                ville VARCHAR(100),
                                is_active BOOLEAN NOT NULL DEFAULT 1,
                                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                                date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                        """))
                    else:
                        conn.execute(text("""
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
                        """))
                    conn.commit()
                except Exception as e:
                    print(f"Table api_grille_tarifaire creation notice: {e}")

            if 'api_echeancier' not in tables:
                try:
                    if is_sqlite:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_echeancier (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                eleve_id INTEGER NOT NULL,
                                ecole_id INTEGER,
                                ET_CODEETABLISSEMENT VARCHAR(50),
                                libelle VARCHAR(150) NOT NULL,
                                service_type VARCHAR(50) NOT NULL DEFAULT 'scolarite',
                                tranche_numero INTEGER NOT NULL DEFAULT 1,
                                montant_prevu DECIMAL(12,2) NOT NULL,
                                montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                                date_echeance DATE,
                                statut VARCHAR(20) NOT NULL DEFAULT 'non_paye',
                                remarque TEXT,
                                annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2026-2027',
                                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                        """))
                    else:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_echeancier (
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
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                        """))
                    conn.commit()
                except Exception as e:
                    print(f"Table api_echeancier creation notice: {e}")

            if 'api_classe' in tables:
                cls_cols = [c['name'] for c in inspector.get_columns('api_classe')]
                if 'ET_CODEETABLISSEMENT' not in cls_cols:
                    conn.execute(text('ALTER TABLE api_classe ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);'))
                    conn.commit()
            if 'api_paiement' in tables:
                pay_cols = [c['name'] for c in inspector.get_columns('api_paiement')]
                if 'date_acquittement' not in pay_cols:
                    conn.execute(text('ALTER TABLE api_paiement ADD COLUMN date_acquittement DATETIME;'))
                    conn.commit()
                if 'frais_annexe_valide' not in pay_cols:
                    conn.execute(text('ALTER TABLE api_paiement ADD COLUMN frais_annexe_valide BOOLEAN DEFAULT 0;'))
                    conn.commit()
                if 'numero_transaction' not in pay_cols:
                    conn.execute(text('ALTER TABLE api_paiement ADD COLUMN numero_transaction VARCHAR(255);'))
                    conn.commit()
                if 'ET_CODEETABLISSEMENT' not in pay_cols:
                    conn.execute(text('ALTER TABLE api_paiement ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);'))
                    conn.commit()
                if 'echeances_affectees' not in pay_cols:
                    conn.execute(text('ALTER TABLE api_paiement ADD COLUMN echeances_affectees TEXT;'))
                    conn.commit()
                # Garde-fou définitif contre les doublons de numéro de reçu (au cas où
                # une future modification réintroduirait un mode de génération non-atomique).
                pay_indexes = [ix['name'] for ix in inspector.get_indexes('api_paiement')]
                if 'uq_paiement_numero_recu' not in pay_indexes:
                    try:
                        if is_sqlite:
                            conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS uq_paiement_numero_recu ON api_paiement (numero_recu);'))
                        else:
                            conn.execute(text('ALTER TABLE api_paiement ADD CONSTRAINT uq_paiement_numero_recu UNIQUE (numero_recu);'))
                        conn.commit()
                    except Exception as e:
                        conn.rollback()
                        print(f"[Warning] Contrainte unique numero_recu non appliquée: {e}")
            if 'api_eleve' in tables:
                e_cols = set(c['name'] for c in inspector.get_columns('api_eleve'))
                eleve_migrations = [
                    ("regime", "VARCHAR(50) DEFAULT 'Non-boursier'"),
                    ("type_inscription", "VARCHAR(20) DEFAULT 'inscription'"),
                    ("qualite_eleve", "VARCHAR(50) DEFAULT 'Non Redoublant(e)'"),
                    ("statut_orientation", "VARCHAR(100) DEFAULT 'Affecte'"),
                    ("prise_en_charge", "BOOLEAN DEFAULT 0"),
                    ("origine_prise_en_charge", "VARCHAR(200)"),
                    ("service_transport", "BOOLEAN DEFAULT 0"),
                    ("service_cantine", "BOOLEAN DEFAULT 0"),
                    ("step_1_validated", "BOOLEAN DEFAULT 0"),
                    ("step_2_validated", "BOOLEAN DEFAULT 0"),
                    ("step_3_validated", "BOOLEAN DEFAULT 0"),
                    ("step_4_validated", "BOOLEAN DEFAULT 0"),
                    ("step_5_validated", "BOOLEAN DEFAULT 0"),
                    ("step_6_validated", "BOOLEAN DEFAULT 0"),
                    ("step_7_validated", "BOOLEAN DEFAULT 0"),
                    ("step_8_validated", "BOOLEAN DEFAULT 0"),
                    ("step_9_validated", "BOOLEAN DEFAULT 0"),
                    ("step_10_validated", "BOOLEAN DEFAULT 0"),
                    ("step_11_validated", "BOOLEAN DEFAULT 0"),
                    ("tenue_validee", "BOOLEAN DEFAULT 0"),
                    ("kit_depose", "BOOLEAN DEFAULT 0"),
                    ("kit_rame_papier", "BOOLEAN DEFAULT 0"),
                    ("kit_papier_hygienique", "BOOLEAN DEFAULT 0"),
                    ("kit_marqueurs_tableau", "BOOLEAN DEFAULT 0"),
                    ("groupe_sanguin", "VARCHAR(10) DEFAULT 'A+'"),
                    ("rhesus", "VARCHAR(5) DEFAULT '+'"),
                    ("allergies_alimentaires", "TEXT"),
                    ("allergies_medicamenteuses", "TEXT"),
                    ("etat_vaccinal", "VARCHAR(100) DEFAULT 'À jour'"),
                    ("has_asthme", "BOOLEAN DEFAULT 0"),
                    ("asthme_traitement", "TEXT"),
                    ("has_drepanocytose", "BOOLEAN DEFAULT 0"),
                    ("drepanocytose_traitement", "TEXT"),
                    ("has_epilepsie", "BOOLEAN DEFAULT 0"),
                    ("epilepsie_traitement", "TEXT"),
                    ("handicap_precision", "TEXT"),
                    ("autres_pathologies", "TEXT"),
                    ("autres_traitement", "TEXT"),
                    ("dispense_sportive", "BOOLEAN DEFAULT 0"),
                    ("dispense_precision", "TEXT"),
                    ("medecin1_contact", "VARCHAR(100)"),
                    ("medecin2_contact", "VARCHAR(100)"),
                    ("nom_assurance", "VARCHAR(200)"),
                    ("data_saisie_logiciel", "BOOLEAN DEFAULT 0"),
                    ("montant_versement", "DECIMAL(12,2) DEFAULT 0.00"),
                    ("mode_reglement", "VARCHAR(50) DEFAULT 'especes'"),
                    ("numero_transaction", "VARCHAR(100)"),
                    ("fiche_imprimee", "BOOLEAN DEFAULT 0"),
                    ("effets_remis", "BOOLEAN DEFAULT 0"),
                    ("billet_retire", "BOOLEAN DEFAULT 0"),
                    ("billet_number", "VARCHAR(100)"),
                    ("dossier_archive", "BOOLEAN DEFAULT 0"),
                    ("inscription_completee_at", "DATETIME")
                ]
                for col_name, col_def in eleve_migrations:
                    if col_name not in e_cols:
                        try:
                            conn.execute(text(f'ALTER TABLE `api_eleve` ADD COLUMN `{col_name}` {col_def};'))
                            conn.commit()
                        except Exception:
                            pass
                # Auto-synchronisation stricte de AU_TOTALDEPOT avec la somme réelle des paiements
                try:
                    conn.execute(text("""
                        UPDATE api_eleve
                        SET AU_TOTALDEPOT = COALESCE((
                            SELECT SUM(montant)
                            FROM api_paiement
                            WHERE api_paiement.eleve_id = api_eleve.id
                              AND (api_paiement.statut IS NULL OR LOWER(api_paiement.statut) != 'annule')
                        ), 0.00),
                        AU_SOLDECOMPTE = COALESCE(api_eleve.AU_SCOLARITE, 0.00) - COALESCE((
                            SELECT SUM(montant)
                            FROM api_paiement
                            WHERE api_paiement.eleve_id = api_eleve.id
                              AND (api_paiement.statut IS NULL OR LOWER(api_paiement.statut) != 'annule')
                        ), 0.00);
                    """))
                    conn.commit()
                except Exception:
                    pass

            if 'api_classe' in tables:
                cls_cols = [c['name'] for c in inspector.get_columns('api_classe')]
                if 'ET_CODEETABLISSEMENT' in cls_cols and 'so_etablissement' in tables:
                    try:
                        conn.execute(text("""
                            UPDATE api_classe
                            JOIN so_etablissement ON api_classe.ecole_id = so_etablissement.IDETABLISSEMENT
                            SET api_classe.ET_CODEETABLISSEMENT = so_etablissement.ET_CODEETABLISSEMENT
                            WHERE api_classe.ET_CODEETABLISSEMENT IS NULL OR api_classe.ET_CODEETABLISSEMENT = '';
                        """))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("""
                            UPDATE api_classe
                            JOIN so_etablissement ON UPPER(TRIM(api_classe.ET_CODEETABLISSEMENT)) = UPPER(TRIM(so_etablissement.ET_CODEETABLISSEMENT))
                            SET api_classe.ecole_id = so_etablissement.IDETABLISSEMENT
                            WHERE api_classe.ecole_id IS NULL;
                        """))
                        conn.commit()
                    except Exception:
                        pass

            if 'api_echeancier' in tables:
                ech_cols = [c['name'] for c in inspector.get_columns('api_echeancier')]
                if 'service_type' not in ech_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_echeancier ADD COLUMN service_type VARCHAR(50) DEFAULT 'scolarite';"))
                        conn.commit()
                    except Exception:
                        pass
                if 'ET_CODEETABLISSEMENT' not in ech_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_echeancier ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);"))
                        conn.commit()
                    except Exception:
                        pass
                if 'ecole_id' not in ech_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_echeancier ADD COLUMN ecole_id INT;"))
                        conn.commit()
                    except Exception:
                        pass

                # Auto-réparation SQL : réaligner service_type d'après le libellé pour les lignes existantes
                try:
                    conn.execute(text("UPDATE api_echeancier SET service_type = 'cantine' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(libelle) LIKE '%cantine%' OR LOWER(libelle) LIKE '%cant%');"))
                    conn.execute(text("UPDATE api_echeancier SET service_type = 'transport' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(libelle) LIKE '%transport%' OR LOWER(libelle) LIKE '%car%');"))
                    conn.execute(text("UPDATE api_echeancier SET service_type = 'examen' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(libelle) LIKE '%examen%' OR LOWER(libelle) LIKE '%bepc%' OR LOWER(libelle) LIKE '%bac%' OR LOWER(libelle) LIKE '%cepe%');"))
                    conn.commit()
                except Exception:
                    pass

                # Auto-synchronisation stricte du code d'établissement et de l'école de l'élève sur son échéancier
                if 'api_eleve' in tables:
                    try:
                        conn.execute(text("""
                            UPDATE api_echeancier
                            JOIN api_eleve ON api_echeancier.eleve_id = api_eleve.id
                            SET api_echeancier.ET_CODEETABLISSEMENT = api_eleve.ET_CODEETABLISSEMENT,
                                api_echeancier.ecole_id = COALESCE(api_echeancier.ecole_id, api_eleve.ecole_id)
                            WHERE (api_echeancier.ET_CODEETABLISSEMENT IS NULL OR api_echeancier.ET_CODEETABLISSEMENT = '')
                              AND api_eleve.ET_CODEETABLISSEMENT IS NOT NULL AND api_eleve.ET_CODEETABLISSEMENT != '';
                        """))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("""
                            UPDATE api_echeancier
                            JOIN api_eleve ON api_echeancier.eleve_id = api_eleve.id
                            SET api_echeancier.ecole_id = api_eleve.ecole_id
                            WHERE api_echeancier.ecole_id IS NULL AND api_eleve.ecole_id IS NOT NULL;
                        """))
                        conn.commit()
                    except Exception:
                        pass

            if 'api_grille_tarifaire' in tables:
                gr_cols = [c['name'] for c in inspector.get_columns('api_grille_tarifaire')]
                if 'ET_CODEETABLISSEMENT' not in gr_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);"))
                        conn.commit()
                    except Exception:
                        pass
                if 'ecole_id' not in gr_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ecole_id INT;"))
                        conn.commit()
                    except Exception:
                        pass
                if 'ville' not in gr_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ville VARCHAR(100);"))
                        conn.commit()
                    except Exception:
                        pass

                # Isoler strictement les grilles tarifaires historiques sans école vers leur établissement d'origine (BKE01 / Bouaké)
                if 'so_etablissement' in tables:
                    try:
                        conn.execute(text("""
                            UPDATE api_grille_tarifaire
                            JOIN so_etablissement ON api_grille_tarifaire.ecole_id = so_etablissement.IDETABLISSEMENT
                            SET api_grille_tarifaire.ET_CODEETABLISSEMENT = so_etablissement.ET_CODEETABLISSEMENT,
                                api_grille_tarifaire.ville = COALESCE(api_grille_tarifaire.ville, so_etablissement.ET_VILLE)
                            WHERE (api_grille_tarifaire.ET_CODEETABLISSEMENT IS NULL OR api_grille_tarifaire.ET_CODEETABLISSEMENT = '')
                              AND so_etablissement.ET_CODEETABLISSEMENT IS NOT NULL;
                        """))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("""
                            UPDATE api_grille_tarifaire
                            JOIN so_etablissement ON UPPER(TRIM(api_grille_tarifaire.ET_CODEETABLISSEMENT)) = UPPER(TRIM(so_etablissement.ET_CODEETABLISSEMENT))
                            SET api_grille_tarifaire.ecole_id = so_etablissement.IDETABLISSEMENT,
                                api_grille_tarifaire.ville = COALESCE(api_grille_tarifaire.ville, so_etablissement.ET_VILLE)
                            WHERE api_grille_tarifaire.ecole_id IS NULL;
                        """))
                        conn.commit()
                    except Exception:
                        pass

                try:
                    conn.execute(text("""
                        UPDATE api_grille_tarifaire
                        SET ET_CODEETABLISSEMENT = 'BKE01', ecole_id = 1, ville = 'Bouaké'
                        WHERE (ET_CODEETABLISSEMENT IS NULL OR ET_CODEETABLISSEMENT = '')
                          AND (ecole_id IS NULL OR ecole_id = 0);
                    """))
                    conn.commit()
                except Exception:
                    pass

            # Synchronisation croisée globale pour Eleves, Paiements, Impayés, Personnel
            if 'api_eleve' in tables and 'api_classe' in tables:
                try:
                    conn.execute(text("""
                        UPDATE api_eleve
                        JOIN api_classe ON api_eleve.classe_id = api_classe.id
                        SET api_eleve.ET_CODEETABLISSEMENT = api_classe.ET_CODEETABLISSEMENT,
                            api_eleve.ecole_id = COALESCE(api_eleve.ecole_id, api_classe.ecole_id)
                        WHERE (api_eleve.ET_CODEETABLISSEMENT IS NULL OR api_eleve.ET_CODEETABLISSEMENT = '')
                          AND api_classe.ET_CODEETABLISSEMENT IS NOT NULL AND api_classe.ET_CODEETABLISSEMENT != '';
                    """))
                    conn.commit()
                except Exception:
                    pass

            if 'api_paiement' in tables and 'api_eleve' in tables:
                try:
                    conn.execute(text("""
                        UPDATE api_paiement
                        JOIN api_eleve ON api_paiement.eleve_id = api_eleve.id
                        SET api_paiement.ET_CODEETABLISSEMENT = api_eleve.ET_CODEETABLISSEMENT,
                            api_paiement.ecole_id = COALESCE(api_paiement.ecole_id, api_eleve.ecole_id)
                        WHERE (api_paiement.ET_CODEETABLISSEMENT IS NULL OR api_paiement.ET_CODEETABLISSEMENT = '')
                          AND api_eleve.ET_CODEETABLISSEMENT IS NOT NULL AND api_eleve.ET_CODEETABLISSEMENT != '';
                    """))
                    conn.commit()
                except Exception:
                    pass

            if 'api_impaye' in tables and 'api_eleve' in tables:
                try:
                    conn.execute(text("""
                        UPDATE api_impaye
                        JOIN api_eleve ON api_impaye.eleve_id = api_eleve.id
                        SET api_impaye.ET_CODEETABLISSEMENT = api_eleve.ET_CODEETABLISSEMENT,
                            api_impaye.ecole_id = COALESCE(api_impaye.ecole_id, api_eleve.ecole_id)
                        WHERE (api_impaye.ET_CODEETABLISSEMENT IS NULL OR api_impaye.ET_CODEETABLISSEMENT = '')
                          AND api_eleve.ET_CODEETABLISSEMENT IS NOT NULL AND api_eleve.ET_CODEETABLISSEMENT != '';
                    """))
                    conn.commit()
                except Exception:
                    pass

            if 'api_personnel' in tables and 'so_etablissement' in tables:
                try:
                    conn.execute(text("""
                        UPDATE api_personnel
                        JOIN so_etablissement ON api_personnel.ecole_id = so_etablissement.IDETABLISSEMENT
                        SET api_personnel.ET_CODEETABLISSEMENT = so_etablissement.ET_CODEETABLISSEMENT
                        WHERE (api_personnel.ET_CODEETABLISSEMENT IS NULL OR api_personnel.ET_CODEETABLISSEMENT = '')
                          AND so_etablissement.ET_CODEETABLISSEMENT IS NOT NULL;
                    """))
                    conn.commit()
                except Exception:
                    pass

                # Auto-réparation : ajouter la tranche Septembre manquante pour les élèves
                # dont les tranches cantine/transport commençaient en Octobre (ancienne logique).
                # Pour chaque (eleve_id, service_type, annee_scolaire) qui a une tranche Octobre
                # mais PAS de tranche Septembre, on insère la tranche Septembre (num=1) et on
                # décale les tranches existantes de +1 (pour qu'Octobre devienne n°2, etc.).
                for svc, prefix in [("cantine", "Cantine"), ("transport", "Transport")]:
                    try:
                        # Récupérer les groupes qui ont Octobre mais pas Septembre
                        rows = conn.execute(text(f"""
                            SELECT DISTINCT e.eleve_id, e.ecole_id, e.annee_scolaire,
                                   MIN(e.montant_prevu) as montant
                            FROM api_echeancier e
                            WHERE e.service_type = :svc
                              AND LOWER(e.libelle) LIKE '%octobre%'
                              AND NOT EXISTS (
                                  SELECT 1 FROM api_echeancier s
                                  WHERE s.eleve_id = e.eleve_id
                                    AND s.service_type = :svc
                                    AND s.annee_scolaire = e.annee_scolaire
                                    AND LOWER(s.libelle) LIKE '%septembre%'
                              )
                            GROUP BY e.eleve_id, e.ecole_id, e.annee_scolaire
                        """), {"svc": svc}).fetchall()

                        for row in rows:
                            eleve_id = row[0]
                            ecole_id = row[1]
                            annee_scolaire = row[2]
                            montant = row[3]
                            # Décaler les tranches existantes de +1
                            conn.execute(text(f"""
                                UPDATE api_echeancier
                                SET tranche_numero = tranche_numero + 1
                                WHERE eleve_id = :eid
                                  AND service_type = :svc
                                  AND annee_scolaire = :as
                                ORDER BY tranche_numero DESC
                            """), {"eid": eleve_id, "svc": svc, "as": annee_scolaire})
                            # Insérer la tranche Septembre (n°1)
                            conn.execute(text(f"""
                                INSERT INTO api_echeancier
                                    (eleve_id, ecole_id, libelle, service_type, tranche_numero,
                                     montant_prevu, montant_paye, date_echeance, statut, annee_scolaire)
                                VALUES
                                    (:eid, :eco, :lib, :svc, 1,
                                     :montant, 0.00, '2026-09-05', 'non_paye', :as)
                            """), {
                                "eid": eleve_id,
                                "eco": ecole_id,
                                "lib": f"{prefix} - Septembre",
                                "svc": svc,
                                "as": annee_scolaire,
                            })
                        conn.commit()
                    except Exception:
                        pass

                # Auto-réalignement des tranches impayées de transport/cantine sur le tarif réel de l'abonnement
                for svc in ("transport", "cantine"):
                    try:
                        rows_svc = conn.execute(text(f"""
                            SELECT eleve_id, annee_scolaire, MAX(montant_paye) as unit_paye
                            FROM api_echeancier
                            WHERE service_type = '{svc}' AND montant_paye > 0
                            GROUP BY eleve_id, annee_scolaire
                        """)).fetchall()
                        for r_s in rows_svc:
                            eid = r_s[0]
                            yr = r_s[1]
                            unit_p = float(r_s[2] or 0.0)
                            if unit_p > 0:
                                conn.execute(text(f"""
                                    UPDATE api_echeancier
                                    SET montant_prevu = :unit_p
                                    WHERE eleve_id = :eid AND service_type = '{svc}' AND annee_scolaire = :yr AND montant_paye = 0
                                """), {"unit_p": unit_p, "eid": eid, "yr": yr})
                        conn.commit()
                    except Exception:
                        pass
            else:
                try:
                    conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS api_echeancier (
                        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        eleve_id INT NOT NULL,
                        ecole_id INT NULL,
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
                        INDEX idx_echeancier_eleve (eleve_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    '''))
                    conn.commit()
                except Exception:
                    pass

            if 'api_impaye' in tables:
                imp_cols = [c['name'] for c in inspector.get_columns('api_impaye')]
                if 'service_type' not in imp_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_impaye ADD COLUMN service_type VARCHAR(50) DEFAULT 'scolarite';"))
                        conn.commit()
                    except Exception:
                        pass

                # Auto-réparation SQL pour impayes
                try:
                    conn.execute(text("UPDATE api_impaye SET service_type = 'cantine' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(remarque) LIKE '%cantine%' OR LOWER(remarque) LIKE '%cant%');"))
                    conn.execute(text("UPDATE api_impaye SET service_type = 'transport' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(remarque) LIKE '%transport%' OR LOWER(remarque) LIKE '%car%');"))
                    conn.execute(text("UPDATE api_impaye SET service_type = 'examen' WHERE (service_type IS NULL OR service_type = 'scolarite') AND (LOWER(remarque) LIKE '%examen%' OR LOWER(remarque) LIKE '%bepc%' OR LOWER(remarque) LIKE '%bac%' OR LOWER(remarque) LIKE '%cepe%');"))
                    conn.commit()
                except Exception:
                    pass
            else:
                try:
                    conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS api_impaye (
                        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        matricule VARCHAR(50) NOT NULL,
                        nom_prenoms VARCHAR(255) NOT NULL,
                        eleve_id INT NOT NULL,
                        classe_id INT NULL,
                        service_type VARCHAR(50) NOT NULL DEFAULT 'scolarite',
                        montant_a_payer DECIMAL(12,2) NOT NULL,
                        montant_verse DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                        solde_restant DECIMAL(12,2) NOT NULL,
                        date_echeance DATE NOT NULL,
                        statut VARCHAR(20) NOT NULL DEFAULT 'non_paye',
                        date_dernier_versement DATETIME NULL,
                        remarque TEXT NULL,
                        annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2025-2026',
                        date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ET_CODEETABLISSEMENT VARCHAR(50) NULL,
                        INDEX idx_impaye_eleve (eleve_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    '''))
                    conn.commit()
                except Exception:
                    pass

            if 'api_grille_tarifaire' in tables:
                gt_cols = [c['name'] for c in inspector.get_columns('api_grille_tarifaire')]
                if 'ET_CODEETABLISSEMENT' not in gt_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);"))
                        conn.commit()
                    except Exception:
                        pass
                if 'ecole_id' not in gt_cols:
                    try:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ecole_id INT NULL;"))
                        conn.commit()
                    except Exception:
                        pass
            else:
                try:
                    conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS api_grille_tarifaire (
                        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        preset_id VARCHAR(100) NOT NULL,
                        label VARCHAR(255) NOT NULL,
                        cycle VARCHAR(100) NOT NULL,
                        niveaux JSON NOT NULL,
                        statut_affectation VARCHAR(20) NOT NULL DEFAULT 'TOUS',
                        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                        tranches JSON NOT NULL,
                        annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2026-2027',
                        ecole_id INT NULL,
                        ET_CODEETABLISSEMENT VARCHAR(50) NULL,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_gt_preset (preset_id),
                        INDEX idx_gt_ecole (ecole_id),
                        INDEX idx_gt_code (ET_CODEETABLISSEMENT)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    '''))
                    conn.commit()
                except Exception:
                    pass
            # Migration automatique de ET_CODEETABLISSEMENT et ecole_id sur toutes les tables opérationnelles
            operational_tables = [
                "api_cycle", "api_niveau", "api_classe", "api_personnel", "api_matiere",
                "api_attributionmatiere", "api_eleve", "api_evaluation", "api_presence",
                "api_paiement", "api_echeancier", "api_impaye", "api_grille_tarifaire",
                "api_demandetraitement", "api_bulletin", "api_rapportrentree",
                "api_rapporttrimestriel", "api_salle", "api_courrier", "api_stock",
                "api_tache", "api_archive", "api_seance", "api_pointage", "api_car",
                "api_chauffeur", "api_trajetbus", "api_affectationtransport",
                "api_tarifservice", "api_pointagebus", "api_bankconfig",
                "api_banktransaction", "api_memorisation", "api_programmationexamen",
                "api_rattrapage", "api_livre", "api_empruntlivre", "api_parcautoagent"
            ]
            for tbl in operational_tables:
                if tbl in tables:
                    tbl_cols = [c['name'] for c in inspector.get_columns(tbl)]
                    if 'ET_CODEETABLISSEMENT' not in tbl_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50);"))
                            conn.commit()
                        except Exception:
                            pass
                    if 'ecole_id' not in tbl_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN ecole_id INT NULL;"))
                            conn.commit()
                        except Exception:
                            pass

            # Auto-alignement des tranches d'échéancier transport & cantine qui auraient des montants prévus obsolètes (ex: 18000 par défaut alors qu'une ligne spécifique 22000 ou 25000 a été souscrite)
            if 'api_echeancier' in tables:
                try:
                    if 'api_affectationtransport' in tables:
                        conn.execute(text("""
                            UPDATE api_echeancier
                            SET montant_prevu = (
                                SELECT a.tarif FROM api_affectationtransport a
                                WHERE a.eleveId = api_echeancier.eleve_id
                                  AND a.tarif IS NOT NULL
                                  AND a.tarif > 0
                                LIMIT 1
                            )
                            WHERE service_type = 'transport'
                              AND (montant_paye IS NULL OR montant_paye = 0)
                              AND EXISTS (
                                SELECT 1 FROM api_affectationtransport a2
                                WHERE a2.eleveId = api_echeancier.eleve_id
                                  AND a2.tarif IS NOT NULL
                                  AND a2.tarif > 0
                              );
                        """))
                        conn.commit()
                except Exception as e:
                    pass

                try:
                    conn.execute(text("""
                        UPDATE api_echeancier
                        SET montant_prevu = (
                            SELECT MAX(montant_paye) FROM api_echeancier e2 
                            WHERE e2.eleve_id = api_echeancier.eleve_id 
                              AND e2.service_type = api_echeancier.service_type 
                              AND e2.montant_paye > 0
                        )
                        WHERE service_type IN ('transport', 'cantine')
                          AND (montant_paye IS NULL OR montant_paye = 0)
                          AND EXISTS (
                            SELECT 1 FROM api_echeancier e3 
                            WHERE e3.eleve_id = api_echeancier.eleve_id 
                              AND e3.service_type = api_echeancier.service_type 
                              AND e3.montant_paye > 0
                          );
                    """))
                    conn.commit()
                except Exception as e:
                    pass

                # Synchronisation et fiabilisation des classes tous cycles (Maternelle, Primaire, Collège)
                if 'api_classe' in tables:
                    try:
                        conn.execute(text("""
                            UPDATE api_classe 
                            SET cycle_id = 3, niveau_id = 10, CE_LIBELLENIVEAU = '6ème', CY_LIBELLECYCLE = 'college'
                            WHERE (CE_LIBELLE LIKE '%6%me%' OR CE_CODECLASSE LIKE '%6EME%' OR CE_CODECLASSE LIKE '%6A%')
                              AND (cycle_id IS NULL OR niveau_id IS NULL);
                        """))
                        conn.execute(text("""
                            UPDATE api_classe 
                            SET cycle_id = 3, niveau_id = 11, CE_LIBELLENIVEAU = '5ème', CY_LIBELLECYCLE = 'college'
                            WHERE (CE_LIBELLE LIKE '%5%me%' OR CE_CODECLASSE LIKE '%5EME%' OR CE_CODECLASSE LIKE '%5A%')
                              AND (cycle_id IS NULL OR niveau_id IS NULL);
                        """))
                        conn.execute(text("""
                            UPDATE api_classe 
                            SET cycle_id = 3, niveau_id = 12, CE_LIBELLENIVEAU = '4ème', CY_LIBELLECYCLE = 'college'
                            WHERE (CE_LIBELLE LIKE '%4%me%' OR CE_CODECLASSE LIKE '%4EME%' OR CE_CODECLASSE LIKE '%4A%')
                              AND (cycle_id IS NULL OR niveau_id IS NULL);
                        """))
                        conn.execute(text("""
                            UPDATE api_classe 
                            SET cycle_id = 3, niveau_id = 13, CE_LIBELLENIVEAU = '3ème', CY_LIBELLECYCLE = 'college'
                            WHERE (CE_LIBELLE LIKE '%3%me%' OR CE_CODECLASSE LIKE '%3EME%' OR CE_CODECLASSE LIKE '%3A%')
                              AND (cycle_id IS NULL OR niveau_id IS NULL);
                        """))
                        conn.execute(text("""
                            UPDATE api_classe 
                            SET cycle_id = 4, niveau_id = 16, CE_LIBELLENIVEAU = 'Terminale', CY_LIBELLECYCLE = 'lycee'
                            WHERE (CE_LIBELLE LIKE '%Term%' OR CE_CODECLASSE LIKE '%TERM%' OR CE_CODECLASSE LIKE '%TA%')
                              AND (cycle_id IS NULL OR niveau_id IS NULL);
                        """))
                        conn.execute(text("UPDATE api_classe SET CY_LIBELLECYCLE = 'maternelle' WHERE cycle_id = 1 AND (CY_LIBELLECYCLE IS NULL OR CY_LIBELLECYCLE != 'maternelle');"))
                        conn.execute(text("UPDATE api_classe SET CY_LIBELLECYCLE = 'primaire' WHERE cycle_id = 2 AND (CY_LIBELLECYCLE IS NULL OR CY_LIBELLECYCLE != 'primaire');"))
                        conn.execute(text("UPDATE api_classe SET CY_LIBELLECYCLE = 'college' WHERE cycle_id = 3 AND (CY_LIBELLECYCLE IS NULL OR CY_LIBELLECYCLE != 'college');"))
                        conn.execute(text("UPDATE api_classe SET CY_LIBELLECYCLE = 'lycee' WHERE cycle_id = 4 AND (CY_LIBELLECYCLE IS NULL OR CY_LIBELLECYCLE != 'lycee');"))
                        if 'api_niveau' in tables:
                            conn.execute(text("""
                                UPDATE api_classe
                                SET CE_LIBELLENIVEAU = (
                                    SELECT libelle FROM api_niveau WHERE api_niveau.id = api_classe.niveau_id
                                )
                                WHERE (CE_LIBELLENIVEAU IS NULL OR CE_LIBELLENIVEAU = '') AND niveau_id IS NOT NULL;
                            """))
                        
                        # Recalcul de l'effectif actuel par classe
                        if 'api_eleve' in tables:
                            conn.execute(text("""
                                UPDATE api_classe 
                                SET CE_EFFECTIF = (
                                    SELECT COUNT(*) FROM api_eleve 
                                    WHERE api_eleve.classe_id = api_classe.id
                                );
                            """))
                        conn.commit()
                    except Exception as e_cls:
                        print(f"Migration classes & levels notice: {e_cls}")
    except Exception as e:
        print(f"[Warning] Migration automatique des colonnes: {e}")

def get_engine():
    import urllib.parse
    pwd = urllib.parse.quote_plus(str(settings.DB_PASSWORD or "Code@96*macsys"))
    user = settings.DB_USER or "insights_dbuser"
    dbname = settings.DB_NAME or "insights_central"
    port = settings.DB_PORT or 3306

    db_url = settings.DATABASE_URL or settings.database_url
    if db_url and "sqlite" in db_url:
        sqlite_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        if not os.path.isabs(sqlite_path):
            sqlite_path = os.path.join(BACKEND_ROOT, os.path.basename(sqlite_path) if os.path.basename(sqlite_path) else "school_educ.db")
        print(f"[DB Info] Utilisation de la base SQLite locale : {sqlite_path}")
        eng = create_engine(
            f"sqlite:///{sqlite_path}",
            connect_args={"check_same_thread": False}
        )
        _auto_migrate_schema(eng)
        return eng

    candidate_urls = []
    if db_url and "mysql" in db_url:
        candidate_urls.append(db_url)

    # Hosts MySQL candidats dans l'ordre de priorité (serveur distant, local)
    hosts_to_try = []
    if settings.DB_HOST:
        hosts_to_try.append(settings.DB_HOST)
    for h in ["10.10.10.100", "127.0.0.1", "localhost"]:
        if h not in hosts_to_try:
            hosts_to_try.append(h)

    for host in hosts_to_try:
        alt_url = f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{dbname}"
        if alt_url not in candidate_urls:
            candidate_urls.append(alt_url)

    last_error = None
    for url in candidate_urls:
        try:
            eng = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=300,
                pool_size=10,
                max_overflow=20,
                connect_args={"connect_timeout": 2}
            )
            # Test direct de la connexion MySQL
            with eng.connect() as conn:
                pass
            print(f"[DB Info] Connecté avec succès à la base de données MySQL : {eng.url.database} sur {eng.url.host}")
            _auto_migrate_schema(eng)
            return eng
        except Exception as e:
            last_error = e
            print(f"[Warning] Échec de connexion MySQL à ({url}): {e}")

    # Fallback automatique sur SQLite local si MySQL est injoignable
    sqlite_db_path = os.path.join(BACKEND_ROOT, "school_educ.db")
    print(f"[DB Info] MySQL non disponible. Basculement automatique vers SQLite : {sqlite_db_path}")
    eng = create_engine(
        f"sqlite:///{sqlite_db_path}",
        connect_args={"check_same_thread": False}
    )
    _auto_migrate_schema(eng)
    return eng

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Context-aware active school management
import contextvars
import logging
from typing import Optional, Tuple
from sqlalchemy import event, func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

active_school_context: contextvars.ContextVar[Tuple[Optional[int], Optional[str]]] = contextvars.ContextVar("active_school_context", default=(None, None))

def set_active_school(ecole_id: Optional[int] = None, code_etablissement: Optional[str] = None):
    """Enregistre l'établissement actif pour la requête en cours."""
    active_school_context.set((ecole_id, code_etablissement))

def get_active_school() -> Tuple[Optional[int], Optional[str]]:
    """Récupère l'établissement actif pour la requête en cours."""
    return active_school_context.get()

def reset_active_school() -> None:
    """Efface l'établissement actif.

    Appelé au début et à la fin de chaque requête HTTP. Sans cette remise à zéro,
    une requête traitée par un thread déjà utilisé pourrait hériter de
    l'établissement de la requête précédente et estampiller ses écritures avec le
    code d'une autre école.
    """
    active_school_context.set((None, None))

@event.listens_for(Session, "before_flush")
def auto_propagate_school_codes_on_flush(session, flush_context, instances):
    """Garantit que tout objet créé ou modifié reçoit automatiquement
    ET_CODEETABLISSEMENT et ecole_id, soit via ses relations parentes,
    soit via le contexte de l'utilisateur actif.
    """
    ctx_ecole_id, ctx_code = active_school_context.get()
    id_to_code = {}
    code_to_id = {}
    
    try:
        from . import models
        for obj in list(session.new) + list(session.dirty):
            has_code = hasattr(obj, "ET_CODEETABLISSEMENT")
            has_id = hasattr(obj, "ecole_id")
            if not has_code and not has_id:
                continue

            cur_code = getattr(obj, "ET_CODEETABLISSEMENT", None)
            cur_id = getattr(obj, "ecole_id", None)

            # 1. Résolution via les entités parentes si manquant
            if not cur_code and not cur_id:
                if hasattr(obj, "eleve_id") and getattr(obj, "eleve_id", None):
                    el = session.query(models.Eleve).filter(models.Eleve.id == getattr(obj, "eleve_id")).first()
                    if el:
                        cur_code = el.ET_CODEETABLISSEMENT
                        cur_id = el.ecole_id
                elif hasattr(obj, "eleveId") and getattr(obj, "eleveId", None):
                    el = session.query(models.Eleve).filter(models.Eleve.id == getattr(obj, "eleveId")).first()
                    if el:
                        cur_code = el.ET_CODEETABLISSEMENT
                        cur_id = el.ecole_id
                elif hasattr(obj, "classe_id") and getattr(obj, "classe_id", None):
                    cl = session.query(models.Classe).filter(models.Classe.id == getattr(obj, "classe_id")).first()
                    if cl:
                        cur_code = cl.ET_CODEETABLISSEMENT
                        cur_id = cl.ecole_id
                elif hasattr(obj, "personnel_id") and getattr(obj, "personnel_id", None):
                    p = session.query(models.Personnel).filter(models.Personnel.id == getattr(obj, "personnel_id")).first()
                    if p:
                        cur_code = p.ET_CODEETABLISSEMENT
                        cur_id = p.ecole_id
                elif hasattr(obj, "enseignant_id") and getattr(obj, "enseignant_id", None):
                    p = session.query(models.Personnel).filter(models.Personnel.id == getattr(obj, "enseignant_id")).first()
                    if p:
                        cur_code = p.ET_CODEETABLISSEMENT
                        cur_id = p.ecole_id
                elif hasattr(obj, "demandeur_id") and getattr(obj, "demandeur_id", None):
                    p = session.query(models.Personnel).filter(models.Personnel.id == getattr(obj, "demandeur_id")).first()
                    if p:
                        cur_code = p.ET_CODEETABLISSEMENT
                        cur_id = p.ecole_id
                elif hasattr(obj, "vehiculeId") and getattr(obj, "vehiculeId", None):
                    c = session.query(models.Car).filter(models.Car.id == getattr(obj, "vehiculeId")).first()
                    if c:
                        cur_code = c.ET_CODEETABLISSEMENT
                        cur_id = getattr(c, "ecole_id", None)
                elif hasattr(obj, "car_id") and getattr(obj, "car_id", None):
                    c = session.query(models.Car).filter(models.Car.id == getattr(obj, "car_id")).first()
                    if c:
                        cur_code = c.ET_CODEETABLISSEMENT
                        cur_id = getattr(c, "ecole_id", None)
                elif hasattr(obj, "salle_id") and getattr(obj, "salle_id", None):
                    s = session.query(models.Salle).filter(models.Salle.id == getattr(obj, "salle_id")).first()
                    if s:
                        cur_code = s.ET_CODEETABLISSEMENT
                        cur_id = s.ecole_id

                if not cur_code and not cur_id:
                    cur_code = ctx_code
                    cur_id = ctx_ecole_id

            # 2. Pont entre ecole_id et ET_CODEETABLISSEMENT si l'un manque
            if cur_id and not cur_code:
                if cur_id not in id_to_code:
                    sch = session.query(models.Etablissement).filter(models.Etablissement.IDETABLISSEMENT == cur_id).first()
                    if sch and sch.ET_CODEETABLISSEMENT:
                        id_to_code[cur_id] = sch.ET_CODEETABLISSEMENT
                cur_code = id_to_code.get(cur_id)

            if cur_code and not cur_id:
                # Le code d'établissement est une clé À DOUBLONS : la maternelle, le
                # primaire et le collège d'un même campus le partagent. On ne peut donc
                # pas en déduire un ecole_id en prenant la première ligne venue — ce
                # serait rattacher l'écriture à un cycle au hasard.
                c_upper = str(cur_code).strip().upper()

                # a) Le cycle porté par l'objet lève l'ambiguïté quand il est connu.
                obj_cycle = getattr(obj, "ET_CYCLE", None) or getattr(obj, "cycle", None)
                if obj_cycle and isinstance(obj_cycle, str):
                    try:
                        sch = session.query(models.Etablissement).filter(
                            func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == c_upper,
                            models.Etablissement.ET_CYCLES.contains(obj_cycle.lower())
                        ).first()
                        if sch:
                            cur_id = sch.IDETABLISSEMENT
                    except Exception:
                        pass

                # b) Sinon on n'accepte le rattachement que si le code ne désigne
                #    qu'une seule école. S'il en désigne plusieurs, ecole_id reste vide :
                #    le code seul suffit à tracer l'écriture au niveau du campus, et une
                #    valeur absente vaut mieux qu'un cycle inventé.
                if not cur_id:
                    if c_upper not in code_to_id:
                        candidats = session.query(models.Etablissement).filter(
                            func.upper(models.Etablissement.ET_CODEETABLISSEMENT) == c_upper
                        ).limit(2).all()
                        code_to_id[c_upper] = candidats[0].IDETABLISSEMENT if len(candidats) == 1 else None
                        if len(candidats) > 1:
                            logger.debug(
                                "Code établissement '%s' partagé par plusieurs cycles : "
                                "ecole_id laissé vide sur %s.", cur_code, type(obj).__name__
                            )
                    cur_id = code_to_id.get(c_upper)

            # 3. Assignation finale sur l'objet
            if has_code and cur_code and getattr(obj, "ET_CODEETABLISSEMENT", None) != cur_code:
                setattr(obj, "ET_CODEETABLISSEMENT", cur_code)
            if has_id and cur_id and getattr(obj, "ecole_id", None) != cur_id:
                setattr(obj, "ecole_id", cur_id)

            # 4. Cascade en cas de changement d'école sur Classe ou Eleve
            if isinstance(obj, models.Classe) and getattr(obj, "id", None):
                if cur_code or cur_id:
                    for el in session.query(models.Eleve).filter(models.Eleve.classe_id == obj.id).all():
                        if cur_id and el.ecole_id != cur_id:
                            el.ecole_id = cur_id
                        if cur_code and el.ET_CODEETABLISSEMENT != cur_code:
                            el.ET_CODEETABLISSEMENT = cur_code
            elif isinstance(obj, models.Eleve) and getattr(obj, "id", None):
                if cur_code or cur_id:
                    for p in session.query(models.Paiement).filter(models.Paiement.eleve_id == obj.id).all():
                        if cur_code and p.ET_CODEETABLISSEMENT != cur_code:
                            p.ET_CODEETABLISSEMENT = cur_code
                        if cur_id and p.ecole_id != cur_id:
                            p.ecole_id = cur_id
                    for ech in session.query(models.EcheancierPaiement).filter(models.EcheancierPaiement.eleve_id == obj.id).all():
                        if cur_id and ech.ecole_id != cur_id:
                            ech.ecole_id = cur_id
                        if cur_code and ech.ET_CODEETABLISSEMENT != cur_code:
                            ech.ET_CODEETABLISSEMENT = cur_code
                    for imp in session.query(models.Impaye).filter(models.Impaye.eleve_id == obj.id).all():
                        if cur_code and imp.ET_CODEETABLISSEMENT != cur_code:
                            imp.ET_CODEETABLISSEMENT = cur_code
                        if cur_id and imp.ecole_id != cur_id:
                            imp.ecole_id = cur_id
    except Exception as hook_err:
        pass

# Dependency to inject DB session into endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
