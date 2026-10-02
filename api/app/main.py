import os
import hashlib
import logging
import traceback
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)

from .config import settings
from .database import engine, Base
from .routers import auth, schools, classes, students, staff, grades, finances, requests, salles, courriers, stocks, taches, archives, uploads, transport, echeancier, caisse, bank, villes, bibliotheque, dossiers, rh_demandes, badges_qr, reductions, tenues, parcauto, audit, rendezvous, annees, tarifs, pointage_badge, periodes
from .services import bank_scheduler
from .school_middleware import EtablissementActifMiddleware

# ─── Logging Configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("hinneh.api")

def init_db():
    from . import models, crud
    # Create database tables dynamically if they don't exist (e.g. on SQLite setup)
    # (For existing MySQL setup, SQLAlchemy maps to the existing tables)
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully.")
        
        # Database-agnostic schema migration to add canevas_data column if missing
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            if not inspector.has_table("api_historique_eleve"):
                try:
                    models.HistoriqueEleve.__table__.create(bind=engine, checkfirst=True)
                    print("Schema migration: Created table api_historique_eleve.")
                except Exception as table_err:
                    print(f"Schema migration warning: {table_err}")

            columns = [c['name'] for c in inspector.get_columns("api_rapporttrimestriel")]
            if columns and "canevas_data" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_rapporttrimestriel ADD COLUMN canevas_data JSON"))
                    conn.commit()
                    print("Schema migration: Added canevas_data column to api_rapporttrimestriel.")
            
            columns_personnel = [c['name'] for c in inspector.get_columns("api_personnel")]
            if columns_personnel and "disponibilites" not in columns_personnel:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_personnel ADD COLUMN disponibilites JSON"))
                    conn.commit()
                    print("Schema migration: Added disponibilites column to api_personnel.")

            columns_paiement = [c['name'] for c in inspector.get_columns("api_paiement")]
            if columns_paiement and "date_acquittement" not in columns_paiement:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_paiement ADD COLUMN date_acquittement DATETIME"))
                    conn.commit()
                    print("Schema migration: Added date_acquittement column to api_paiement.")

            columns_matiere = [c['name'] for c in inspector.get_columns("api_matiere")]
            if columns_matiere and "parent_id" not in columns_matiere:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_matiere ADD COLUMN parent_id INTEGER REFERENCES api_matiere(id)"))
                    conn.commit()
                    print("Schema migration: Added parent_id column to api_matiere.")

            columns_attribution = [c['name'] for c in inspector.get_columns("api_attributionmatiere")]
            if columns_attribution and "groupe" not in columns_attribution:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_attributionmatiere ADD COLUMN groupe VARCHAR(50) DEFAULT 'Classe entière'"))
                    conn.commit()
                    print("Schema migration: Added groupe column to api_attributionmatiere.")

            # api_evaluation updates
            columns_evaluation = [c['name'] for c in inspector.get_columns("api_evaluation")]
            if columns_evaluation:
                new_cols = []
                if "devoir_numero" not in columns_evaluation:
                    new_cols.append("devoir_numero VARCHAR(50)")
                if "date_recuperation" not in columns_evaluation:
                    new_cols.append("date_recuperation DATE")
                if "date_correction" not in columns_evaluation:
                    new_cols.append("date_correction DATE")
                if "date_remise" not in columns_evaluation:
                    new_cols.append("date_remise DATE")
                if "valide" not in columns_evaluation:
                    new_cols.append("valide BOOLEAN DEFAULT 0")
                if "autorisation_modification" not in columns_evaluation:
                    new_cols.append("autorisation_modification BOOLEAN DEFAULT 0")
                if "justification_modification" not in columns_evaluation:
                    new_cols.append("justification_modification TEXT")
                
                if new_cols:
                    with engine.connect() as conn:
                        for col in new_cols:
                            conn.execute(text(f"ALTER TABLE api_evaluation ADD COLUMN {col}"))
                        conn.commit()
                        print("Schema migration: Added new columns to api_evaluation.")

            # api_presence updates
            columns_presence = [c['name'] for c in inspector.get_columns("api_presence")]
            if columns_presence and "heure" not in columns_presence:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api_presence ADD COLUMN heure VARCHAR(50)"))
                    conn.commit()
                    print("Schema migration: Added heure column to api_presence.")

            # api_bankconfig : colonnes d'automatisation de la synchronisation bancaire
            if inspector.has_table("api_bankconfig"):
                columns_bank = [c['name'] for c in inspector.get_columns("api_bankconfig")]
                nouvelles_colonnes_bank = []
                if "sync_auto" not in columns_bank:
                    nouvelles_colonnes_bank.append("sync_auto BOOLEAN DEFAULT 1")
                if "sync_intervalle_minutes" not in columns_bank:
                    nouvelles_colonnes_bank.append("sync_intervalle_minutes INTEGER DEFAULT 10")
                if "sync_lookback_jours" not in columns_bank:
                    nouvelles_colonnes_bank.append("sync_lookback_jours INTEGER DEFAULT 7")
                if "rapprochement_auto" not in columns_bank:
                    nouvelles_colonnes_bank.append("rapprochement_auto BOOLEAN DEFAULT 1")
                if "resultat_derniere_sync" not in columns_bank:
                    nouvelles_colonnes_bank.append("resultat_derniere_sync TEXT")
                if nouvelles_colonnes_bank:
                    with engine.connect() as conn:
                        for col in nouvelles_colonnes_bank:
                            conn.execute(text(f"ALTER TABLE api_bankconfig ADD COLUMN {col}"))
                        conn.commit()

            # Migration: LOGO column must be TEXT (not VARCHAR) to hold base64 images
            if inspector.has_table("so_etablissement"):
                logo_col = next((c for c in inspector.get_columns("so_etablissement") if c['name'].upper() == 'LOGO'), None)
                if logo_col:
                    db_type = str(logo_col['type']).upper()
                    if 'VARCHAR' in db_type or 'CHAR' in db_type:
                        with engine.connect() as conn:
                            # SQLite uses TEXT directly; MySQL uses LONGTEXT for safety
                            if engine.dialect.name == 'sqlite':
                                conn.execute(text("ALTER TABLE so_etablissement RENAME COLUMN LOGO TO LOGO_OLD"))
                                conn.execute(text("ALTER TABLE so_etablissement ADD COLUMN LOGO TEXT"))
                                conn.execute(text("UPDATE so_etablissement SET LOGO = LOGO_OLD"))
                                conn.execute(text("ALTER TABLE so_etablissement DROP COLUMN LOGO_OLD"))
                            else:
                                conn.execute(text("ALTER TABLE so_etablissement MODIFY COLUMN LOGO LONGTEXT"))
                            conn.commit()
                            print("Schema migration: LOGO column converted to TEXT in so_etablissement.")

            # Ensure ET_CODEETABLISSEMENT, ajoutele, modifierle, idUser columns exist on all tables
            target_tables = [
                "user_educ", "so_etablissement", "api_cycle", "api_niveau", "api_classe", 
                "api_personnel", "api_matiere", "api_attributionmatiere", "api_eleve", 
                "api_evaluation", "api_presence", "api_paiement", "api_echeancier", 
                "api_demandetraitement", "api_bulletin", "api_rapportrentree", "api_rapporttrimestriel", 
                "api_salle", "api_courrier", "api_stock", "api_tache", "api_archive", 
                "api_seance", "api_pointage", "api_car", "api_trajetbus", "api_affectationtransport", 
                "api_pointagebus", "api_bankconfig", "api_banktransaction"
            ]
            for tbl in target_tables:
                if inspector.has_table(tbl):
                    cols = [c['name'] for c in inspector.get_columns(tbl)]
                    cols_lower = [c.lower() for c in cols]
                    with engine.connect() as conn:
                        if "et_codeetablissement" not in cols_lower:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN ET_CODEETABLISSEMENT VARCHAR(50)"))
                            conn.commit()
                            print(f"Schema migration: Added ET_CODEETABLISSEMENT to {tbl}.")
                        if "ajoutele" not in cols_lower:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN ajoutele DATETIME"))
                            conn.commit()
                            print(f"Schema migration: Added ajoutele to {tbl}.")
                        if "modifierle" not in cols_lower:
                            conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN modifierle DATETIME"))
                            conn.commit()
                            print(f"Schema migration: Added modifierle to {tbl}.")
            # Ensure api_personnel has authorization and CNPS columns
            if inspector.has_table("api_personnel"):
                p_cols = [c['name'].lower() for c in inspector.get_columns("api_personnel")]
                with engine.connect() as conn:
                    if "num_autorisation_enseigner" not in p_cols:
                        conn.execute(text("ALTER TABLE api_personnel ADD COLUMN num_autorisation_enseigner VARCHAR(100)"))
                        conn.commit()
                    if "num_autorisation_exercer" not in p_cols:
                        conn.execute(text("ALTER TABLE api_personnel ADD COLUMN num_autorisation_exercer VARCHAR(100)"))
                        conn.commit()
                    if "is_cnps_declare" not in p_cols:
                        conn.execute(text("ALTER TABLE api_personnel ADD COLUMN is_cnps_declare BOOLEAN DEFAULT 1"))
                        conn.commit()

            # Ensure api_matiere has subject category and 2nd cycle coefficient columns
            if inspector.has_table("api_matiere"):
                m_cols = [c['name'].lower() for c in inspector.get_columns("api_matiere")]
                with engine.connect() as conn:
                    if "categorie_groupe" not in m_cols:
                        conn.execute(text("ALTER TABLE api_matiere ADD COLUMN categorie_groupe VARCHAR(50) DEFAULT 'litteraire'"))
                        conn.commit()
                    if "coefficient_defaut" not in m_cols:
                        conn.execute(text("ALTER TABLE api_matiere ADD COLUMN coefficient_defaut FLOAT DEFAULT 1.0"))
                        conn.commit()
                    if "coefficient_2nd_cycle" not in m_cols:
                        conn.execute(text("ALTER TABLE api_matiere ADD COLUMN coefficient_2nd_cycle TEXT"))
                        conn.commit()

            # Ensure api_grille_tarifaire has type_service, ville, zone_trajet, periodicite columns
            if inspector.has_table("api_grille_tarifaire"):
                g_cols = [c['name'].lower() for c in inspector.get_columns("api_grille_tarifaire")]
                with engine.connect() as conn:
                    if "type_service" not in g_cols:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN type_service VARCHAR(50) DEFAULT 'scolarite'"))
                        conn.commit()
                        print("Schema migration: Added type_service to api_grille_tarifaire.")
                    if "ville" not in g_cols:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN ville VARCHAR(100)"))
                        conn.commit()
                        print("Schema migration: Added ville to api_grille_tarifaire.")
                    if "zone_trajet" not in g_cols:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN zone_trajet VARCHAR(150)"))
                        conn.commit()
                        print("Schema migration: Added zone_trajet to api_grille_tarifaire.")
                    if "periodicite" not in g_cols:
                        conn.execute(text("ALTER TABLE api_grille_tarifaire ADD COLUMN periodicite VARCHAR(50)"))
                        conn.commit()
                        print("Schema migration: Added periodicite to api_grille_tarifaire.")

            # Ensure user_educ carries the forced-password-change flag
            if inspector.has_table("user_educ"):
                u_cols = [c['name'].lower() for c in inspector.get_columns("user_educ")]
                if "must_change_password" not in u_cols:
                    with engine.connect() as conn:
                        try:
                            conn.execute(text(
                                "ALTER TABLE user_educ ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 NOT NULL"
                            ))
                            conn.commit()
                            print("Schema migration: Added must_change_password to user_educ.")
                        except Exception as e_mcp:
                            print(f"Schema migration warning (must_change_password): {e_mcp}")

            # Ensure api_rendezvous table exists with correct types and columns
            if not inspector.has_table("api_rendezvous"):
                with engine.connect() as conn:
                    try:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS api_rendezvous (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                numero_ticket VARCHAR(30),
                                nom VARCHAR(150) NOT NULL,
                                telephone VARCHAR(30) NOT NULL,
                                email VARCHAR(150),
                                nom_eleve VARCHAR(150),
                                matricule_national VARCHAR(50),
                                classe_precedente VARCHAR(100),
                                type_demarche VARCHAR(20),
                                niveau VARCHAR(150),
                                ecole_id INT,
                                date_souhaitee DATE,
                                heure_souhaitee VARCHAR(10),
                                motif TEXT,
                                statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
                                eleve_id BIGINT,
                                date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
                                date_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                ET_CODEETABLISSEMENT VARCHAR(50),
                                INDEX idx_rdv_ecole (ecole_id),
                                INDEX idx_rdv_date (date_souhaitee),
                                INDEX idx_rdv_eleve (eleve_id)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                        """))
                        conn.commit()
                        print("Schema migration: Created api_rendezvous table.")
                    except Exception as e_rdv:
                        print(f"Schema migration warning (api_rendezvous create): {e_rdv}")
            else:
                rdv_cols = [c['name'].lower() for c in inspector.get_columns("api_rendezvous")]
                nouvelles_colonnes = [
                    ("nom_eleve", "VARCHAR(150)"),
                    ("matricule_national", "VARCHAR(50)"),
                    ("classe_precedente", "VARCHAR(100)"),
                    ("type_demarche", "VARCHAR(20)"),
                    ("niveau", "VARCHAR(150)"),
                ]
                with engine.connect() as conn:
                    for nom_col, type_col in nouvelles_colonnes:
                        if nom_col not in rdv_cols:
                            try:
                                conn.execute(text(f"ALTER TABLE api_rendezvous ADD COLUMN {nom_col} {type_col}"))
                                conn.commit()
                                print(f"Schema migration: Added {nom_col} to api_rendezvous.")
                            except Exception as e_col:
                                print(f"Schema migration warning (api_rendezvous {nom_col}): {e_col}")

            # Ensure api_eleve has all model columns
            if inspector.has_table("api_eleve"):
                existing_eleve_cols = [c['name'].lower() for c in inspector.get_columns("api_eleve")]
                model_eleve_cols = models.Eleve.__table__.columns
                with engine.connect() as conn:
                    for col in model_eleve_cols:
                        if col.name.lower() not in existing_eleve_cols:
                            col_type = "TEXT"
                            if "BOOLEAN" in str(col.type).upper() or "INT" in str(col.type).upper():
                                col_type = "INTEGER DEFAULT 0"
                            elif "FLOAT" in str(col.type).upper() or "NUMERIC" in str(col.type).upper():
                                col_type = "REAL DEFAULT 0.0"
                            elif "DATETIME" in str(col.type).upper() or "DATE" in str(col.type).upper():
                                col_type = "DATETIME"
                            try:
                                conn.execute(text(f"ALTER TABLE api_eleve ADD COLUMN {col.name} {col_type}"))
                                conn.commit()
                                print(f"Schema migration: Added missing column {col.name} to api_eleve.")
                            except Exception as col_err:
                                print(f"Schema migration warning ({col.name}): {col_err}")
        except Exception as migration_error:
            print(f"Schema migration warning: {migration_error}")

        # Auto-seed basic reference data if database is empty
        try:
            from sqlalchemy.orm import Session
            from sqlalchemy import func
            from . import models, crud
            from decimal import Decimal
            from datetime import datetime
            
            db = Session(bind=engine)
            
            # 1. Seed default cycles if empty
            if db.query(models.Cycle).count() == 0:
                print("Auto-seeding default cycles...")
                cycles = {
                    "maternelle": models.Cycle(id=1, libelle="Maternelle", code="MATERNELLE", actif=True, ordre=1),
                    "primaire": models.Cycle(id=2, libelle="Primaire", code="PRIMAIRE", actif=True, ordre=2),
                    "college": models.Cycle(id=3, libelle="Collège", code="COLLEGE", actif=True, ordre=3),
                    "lycee": models.Cycle(id=4, libelle="Collège 2nd cycle", code="LYCEE", actif=True, ordre=4),
                }
                for c in cycles.values():
                    db.add(c)
                db.commit()
                
                # 2. Seed default levels if empty
                if db.query(models.Niveau).count() == 0:
                    print("Auto-seeding default levels...")
                    niveaux = [
                        # Maternelle
                        models.Niveau(id=1, libelle="Petite Section", code="PS", actif=True, ordre=1, cycle_id=1, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
                        models.Niveau(id=2, libelle="Moyenne Section", code="MS", actif=True, ordre=2, cycle_id=1, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
                        models.Niveau(id=3, libelle="Grande Section", code="GS", actif=True, ordre=3, cycle_id=1, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
                        # Primaire
                        models.Niveau(id=4, libelle="CP1", code="CP1", actif=True, ordre=4, cycle_id=2, scolarite=Decimal("75000.00"), droit_inscription=Decimal("15000.00")),
                        models.Niveau(id=5, libelle="CP2", code="CP2", actif=True, ordre=5, cycle_id=2, scolarite=Decimal("75000.00"), droit_inscription=Decimal("15000.00")),
                        models.Niveau(id=6, libelle="CE1", code="CE1", actif=True, ordre=6, cycle_id=2, scolarite=Decimal("80000.00"), droit_inscription=Decimal("15000.00")),
                        models.Niveau(id=7, libelle="CE2", code="CE2", actif=True, ordre=7, cycle_id=2, scolarite=Decimal("80000.00"), droit_inscription=Decimal("15000.00")),
                        models.Niveau(id=8, libelle="CM1", code="CM1", actif=True, ordre=8, cycle_id=2, scolarite=Decimal("90000.00"), droit_inscription=Decimal("15000.00")),
                        models.Niveau(id=9, libelle="CM2", code="CM2", actif=True, ordre=9, cycle_id=2, scolarite=Decimal("90000.00"), droit_inscription=Decimal("20000.00")),
                        # Collège
                        models.Niveau(id=10, libelle="6ème", code="6EME", actif=True, ordre=10, cycle_id=3, scolarite=Decimal("120000.00"), droit_inscription=Decimal("25000.00")),
                        models.Niveau(id=11, libelle="5ème", code="5EME", actif=True, ordre=11, cycle_id=3, scolarite=Decimal("120000.00"), droit_inscription=Decimal("25000.00")),
                        models.Niveau(id=12, libelle="4ème", code="4EME", actif=True, ordre=12, cycle_id=3, scolarite=Decimal("130000.00"), droit_inscription=Decimal("25000.00")),
                        models.Niveau(id=13, libelle="3ème", code="3EME", actif=True, ordre=13, cycle_id=3, scolarite=Decimal("140000.00"), droit_inscription=Decimal("30000.00")),
                        # Collège 2nd cycle
                        models.Niveau(id=14, libelle="Seconde", code="2ND", actif=True, ordre=14, cycle_id=4, scolarite=Decimal("160000.00"), droit_inscription=Decimal("30000.00")),
                        models.Niveau(id=15, libelle="Première", code="1ERE", actif=True, ordre=15, cycle_id=4, scolarite=Decimal("170000.00"), droit_inscription=Decimal("30000.00")),
                        models.Niveau(id=16, libelle="Terminale", code="TERM", actif=True, ordre=16, cycle_id=4, scolarite=Decimal("180000.00"), droit_inscription=Decimal("35000.00")),
                    ]
                    for n in niveaux:
                        db.add(n)
                    db.commit()
            
            # 2b. Seed default villes if empty
            if db.query(models.Ville).count() == 0:
                print("Auto-seeding default villes...")
                villes_initiales = [
                    {"libelle": "Abidjan", "code": "ABJ", "region": "Lagunes", "statut": "actif"},
                    {"libelle": "Bouaké", "code": "BKE", "region": "GBÊKÊ", "statut": "actif"},
                    {"libelle": "Yamoussoukro", "code": "YMK", "region": "Bélier", "statut": "actif"},
                    {"libelle": "Korhogo", "code": "KGO", "region": "Poro", "statut": "actif"},
                    {"libelle": "San-Pédro", "code": "SP", "region": "Bas-Sassandra", "statut": "actif"},
                    {"libelle": "Daloa", "code": "DLA", "region": "Haut-Sassandra", "statut": "actif"},
                    {"libelle": "Man", "code": "MAN", "region": "Tonkpi", "statut": "actif"},
                    {"libelle": "Gagnoa", "code": "GGO", "region": "Gôh", "statut": "actif"},
                ]
                for v in villes_initiales:
                    db.add(models.Ville(**v))
                db.commit()

            # 3. Seed default subjects if empty
            if db.query(models.Matiere).count() == 0:
                print("Auto-seeding default subjects...")
                matieres_data = [
                    {"id": 1, "libelle": "Mathématiques", "code": "MATH", "actif": True},
                    {"id": 2, "libelle": "Français", "code": "FR", "actif": True},
                    {"id": 3, "libelle": "Anglais", "code": "ANG", "actif": True},
                    {"id": 4, "libelle": "Histoire-Géographie", "code": "HG", "actif": True},
                    {"id": 5, "libelle": "Sciences Physiques", "code": "PC", "actif": True},
                    {"id": 6, "libelle": "SVT", "code": "SVT", "actif": True},
                    {"id": 7, "libelle": "Arabe", "code": "AR", "actif": True},
                    {"id": 8, "libelle": "Éducation Islamique", "code": "EI", "actif": True},
                    {"id": 9, "libelle": "Coran", "code": "COR", "actif": True},
                    {"id": 10, "libelle": "Tajwid", "code": "TAJ", "actif": True},
                ]
                for m in matieres_data:
                    db.add(models.Matiere(**m))
                db.commit()
                
            # 4b. Seed sub-subjects & divided classes (Français, EPS, Langues)
            try:
                # Français
                fr_subj = db.query(models.Matiere).filter(models.Matiere.code == "FR").first()
                if not fr_subj:
                    fr_subj = db.query(models.Matiere).filter(models.Matiere.libelle.like("%Français%")).first()
                
                if fr_subj:
                    sub_fr_exists = db.query(models.Matiere).filter(models.Matiere.parent_id == fr_subj.id).count() > 0
                    if not sub_fr_exists:
                        print("Auto-seeding Français sub-subjects...")
                        sub_fr = [
                            models.Matiere(libelle="Grammaire", code="FR_GRAM", parent_id=fr_subj.id, actif=True),
                            models.Matiere(libelle="Résumé", code="FR_RES", parent_id=fr_subj.id, actif=True),
                            models.Matiere(libelle="Composition", code="FR_COMP", parent_id=fr_subj.id, actif=True),
                        ]
                        db.add_all(sub_fr)
                        db.commit()

                # EPS
                eps_subj = db.query(models.Matiere).filter(models.Matiere.code == "EPS").first()
                if not eps_subj:
                    print("Auto-seeding EPS parent subject...")
                    eps_subj = models.Matiere(libelle="EPS", code="EPS", actif=True)
                    db.add(eps_subj)
                    db.commit()
                    db.refresh(eps_subj)

                sub_eps_exists = db.query(models.Matiere).filter(models.Matiere.parent_id == eps_subj.id).count() > 0
                if not sub_eps_exists:
                    print("Auto-seeding EPS sub-subjects...")
                    sub_eps = [
                        models.Matiere(libelle="Garçons", code="EPS_G", parent_id=eps_subj.id, actif=True),
                        models.Matiere(libelle="Filles", code="EPS_F", parent_id=eps_subj.id, actif=True),
                    ]
                    db.add_all(sub_eps)
                    db.commit()

                # Langues vivantes
                lv_subj = db.query(models.Matiere).filter(models.Matiere.code == "LV").first()
                if not lv_subj:
                    print("Auto-seeding Langues vivantes parent subject...")
                    lv_subj = models.Matiere(libelle="Langues vivantes", code="LV", actif=True)
                    db.add(lv_subj)
                    db.commit()
                    db.refresh(lv_subj)

                sub_lv_exists = db.query(models.Matiere).filter(models.Matiere.parent_id == lv_subj.id).count() > 0
                if not sub_lv_exists:
                    print("Auto-seeding Langues vivantes sub-subjects...")
                    sub_lv = [
                        models.Matiere(libelle="Espagnol", code="LV_ESP", parent_id=lv_subj.id, actif=True),
                        models.Matiere(libelle="Allemand", code="LV_ALL", parent_id=lv_subj.id, actif=True),
                    ]
                    db.add_all(sub_lv)
                    db.commit()
            except Exception as seed_sub_error:
                print(f"Error seeding sub-subjects: {seed_sub_error}")
                
            # 5. Seed default admin & teacher if no users
            if db.query(models.CustomUser).count() == 0:
                print("Auto-seeding default users & staff...")
                admin_user = models.CustomUser(
                    id=1,
                    username="admin@hinneh.ci",
                    email="admin@hinneh.ci",
                    password=crud.get_password_hash("dev2026"),
                    first_name="Admin",
                    last_name="Système",
                    is_superuser=True,
                    is_staff=True,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)

                # Create admin personnel profile linked to the admin user
                admin_school = db.query(models.Etablissement).first()
                admin_school_id = admin_school.IDETABLISSEMENT if admin_school else 1
                admin_staff = models.Personnel(
                    id=1,
                    prenom="Admin",
                    nom="Système",
                    email="admin@hinneh.ci",
                    telephone="+225 00 00 00 00 00",
                    fonction="admin",
                    statut="actif",
                    charge_horaire=0,
                    ecole_id=admin_school_id,
                    user_id=admin_user.id,
                    date_creation=datetime.utcnow()
                )
                db.add(admin_staff)
                db.commit()

                # Seed a default teacher and their personnel profile
                teacher_user = models.CustomUser(
                    id=2,
                    username="enseignant@hinneh.ci",
                    email="enseignant@hinneh.ci",
                    password=crud.get_password_hash("dev2026"),
                    first_name="Souleymane",
                    last_name="Coulibaly",
                    is_staff=True,
                    is_active=True
                )
                db.add(teacher_user)
                db.commit()
                
                # Find default school ID
                school = db.query(models.Etablissement).first()
                school_id = school.IDETABLISSEMENT if school else 1
                
                teacher_staff = models.Personnel(
                    id=1,
                    prenom="Souleymane",
                    nom="Coulibaly",
                    email="enseignant@hinneh.ci",
                    telephone="+225 07 00 00 00 00",
                    fonction="enseignant",
                    statut="actif",
                    charge_horaire=18,
                    ecole_id=school_id,
                    user_id=2,
                    score_evaluation=85.0,
                    date_creation=datetime.utcnow()
                )
                db.add(teacher_staff)
                db.commit()
            # Seed City-Specific Direction Accounts
            city_accounts = [
                {
                    "username": "admin.abidjan@hinneh.ci",
                    "email": "admin.abidjan@hinneh.ci",
                    "first_name": "Direction",
                    "last_name": "Abidjan",
                    "ville": "Abidjan"
                },
                {
                    "username": "admin.bouake@hinneh.ci",
                    "email": "admin.bouake@hinneh.ci",
                    "first_name": "Direction",
                    "last_name": "Bouaké",
                    "ville": "Bouaké"
                },
                {
                    "username": "admin.yamoussoukro@hinneh.ci",
                    "email": "admin.yamoussoukro@hinneh.ci",
                    "first_name": "Direction",
                    "last_name": "Yamoussoukro",
                    "ville": "Yamoussoukro"
                },
                {
                    "username": "admin.sanpedro@hinneh.ci",
                    "email": "admin.sanpedro@hinneh.ci",
                    "first_name": "Direction",
                    "last_name": "San-Pédro",
                    "ville": "San-Pédro"
                },
            ]

            for acc in city_accounts:
                existing_u = db.query(models.CustomUser).filter(models.CustomUser.username == acc["username"]).first()
                if not existing_u:
                    sch = db.query(models.Etablissement).filter(func.lower(models.Etablissement.ET_VILLE) == acc["ville"].lower()).first()
                    if not sch:
                        sch = db.query(models.Etablissement).first()

                    if sch:
                        max_uid = db.query(func.max(models.CustomUser.id)).scalar() or 0
                        new_u = models.CustomUser(
                            id=max_uid + 1,
                            username=acc["username"],
                            email=acc["email"],
                            password=crud.get_password_hash("Code@123"),
                            first_name=acc["first_name"],
                            last_name=acc["last_name"],
                            is_staff=True,
                            is_active=True
                        )
                        db.add(new_u)
                        db.commit()
                        db.refresh(new_u)

                        max_pid = db.query(func.max(models.Personnel.id)).scalar() or 0
                        new_st = models.Personnel(
                            id=max_pid + 1,
                            prenom=acc["first_name"],
                            nom=acc["last_name"],
                            email=acc["email"],
                            telephone="+225 07 00 00 00 00",
                            fonction="directeur_ecole",
                            statut="actif",
                            ecole_id=sch.IDETABLISSEMENT,
                            user_id=new_u.id
                        )
                        db.add(new_st)
                        db.commit()

            db.close()
        except Exception as seed_err:
            print(f"Auto-seeding warning: {seed_err}")
    except Exception as e:
        print(f"Warning: Could not create tables automatically (might be using existing read-only DB). Error: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        from .sync_school_codes import sync_school_codes_across_tables
        from .database import SessionLocal
        with SessionLocal() as db:
            sync_school_codes_across_tables(db)
            print("School codes synchronization executed successfully on startup.")
    except Exception as e:
        print(f"Warning: School codes synchronization on startup failed: {e}")
    bank_scheduler.demarrer()


@app.on_event("shutdown")
async def on_shutdown():
    await bank_scheduler.arreter()

# ─── Ordre des middlewares (IMPORTANT) ───────────────────────────────────────
# Starlette empile les middlewares à l'envers : le DERNIER ajouté est le PREMIER
# exécuté. Pour que CORS soit traité en tout premier (y compris les préflight
# OPTIONS), il doit être ajouté EN DERNIER.
#
#  Ordre d'exécution réel :  CORSMiddleware → GZip → EtablissementActif → route
#  Ordre d'add_middleware :  EtablissementActif → GZip → CORS
#
# EtablissementActifMiddleware doit s'exécuter APRÈS CORS (donc être ajouté EN PREMIER).

# 1. EtablissementActif — innermost : estampille les écritures du code école
app.add_middleware(EtablissementActifMiddleware)

# 2. GZip — compresse les réponses volumineuses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. CORS — outermost : doit traiter les préflight OPTIONS avant tout le reste
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-School-Code", "X-School-Id", "Accept", "Origin"],
    expose_headers=["Content-Disposition"],
    max_age=3600,
)

# ─── Gestionnaires d'erreurs HTTP structurés ─────────────────────────────────

@app.exception_handler(400)
async def bad_request_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"400 Bad Request: {request.url} — {exc.detail}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "Requête incorrecte",
            "detail": exc.detail if hasattr(exc, 'detail') else "Les données envoyées sont invalides.",
            "code": 400
        }
    )

@app.exception_handler(401)
async def unauthorized_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"401 Unauthorized: {request.url}")
    detail_msg = exc.detail if hasattr(exc, 'detail') and exc.detail else "Authentification requise. Veuillez vous connecter."
    return JSONResponse(
        status_code=401,
        content={
            "error": "Non autorisé",
            "detail": detail_msg,
            "code": 401
        }
    )

@app.exception_handler(403)
async def forbidden_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"403 Forbidden: {request.url}")
    detail_msg = exc.detail if hasattr(exc, 'detail') and exc.detail else "Vous n'avez pas les droits nécessaires pour accéder à cette ressource."
    return JSONResponse(
        status_code=403,
        content={
            "error": "Accès refusé",
            "detail": detail_msg,
            "code": 403
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: StarletteHTTPException):
    logger.info(f"404 Not Found: {request.url}")
    return JSONResponse(
        status_code=404,
        content={
            "error": "Ressource introuvable",
            "detail": exc.detail if hasattr(exc, 'detail') else f"La ressource demandée '{request.url.path}' n'existe pas.",
            "code": 404
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " → ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Valeur invalide")
        errors.append(f"{loc}: {msg}" if loc else msg)
    logger.warning(f"422 Validation Error: {request.url} — {errors}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Données invalides",
            "detail": "; ".join(errors) or "Les données soumises sont incorrectes.",
            "fields": exc.errors(),
            "code": 422
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    status_messages = {
        400: "Requête incorrecte",
        401: "Non autorisé",
        403: "Accès refusé",
        404: "Ressource introuvable",
        405: "Méthode non autorisée",
        408: "Délai d'attente dépassé",
        409: "Conflit de données",
        413: "Données trop volumineuses",
        422: "Données invalides",
        429: "Trop de requêtes",
        500: "Erreur serveur interne",
        502: "Erreur de passerelle",
        503: "Service indisponible",
        504: "Délai de passerelle dépassé",
    }
    logger.warning(f"{exc.status_code} HTTP Error: {request.url} — {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": status_messages.get(exc.status_code, "Erreur HTTP"),
            "detail": exc.detail or status_messages.get(exc.status_code, "Une erreur s'est produite."),
            "code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    exc_type = type(exc).__name__

    # JWT / jose errors → 401
    if "JWTError" in exc_type or "jose" in str(type(exc).__module__):
        logger.warning(f"JWT error on {request.url}: {exc}")
        return JSONResponse(
            status_code=401,
            content={
                "error": "Non autorisé",
                "detail": "Token invalide ou expiré. Veuillez vous reconnecter.",
                "code": 401
            }
        )

    # Database connection errors → 503
    if any(k in exc_type for k in ["OperationalError", "DatabaseError", "InterfaceError", "PoolTimeout"]):
        logger.error(f"503 Database error on {request.url}: {exc}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Service temporairement indisponible",
                "detail": "La base de données est momentanément inaccessible. Veuillez réessayer dans quelques instants.",
                "code": 503
            }
        )

    # Delegate known HTTP exceptions
    if isinstance(exc, StarletteHTTPException):
        return await http_error_handler(request, exc)
    if isinstance(exc, RequestValidationError):
        return await validation_error_handler(request, exc)

    # Unhandled → 500
    logger.error(f"500 Unhandled exception on {request.url}: {exc_type}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erreur interne du serveur",
            "detail": "Une erreur inattendue s'est produite. L'équipe technique a été notifiée.",
            "code": 500
        }
    )

# Include Routers
app.include_router(auth.router, prefix=settings.API_STR)
app.include_router(schools.router, prefix=settings.API_STR)
app.include_router(classes.router, prefix=settings.API_STR)
app.include_router(students.router, prefix=settings.API_STR)
app.include_router(staff.router, prefix=settings.API_STR)
app.include_router(grades.router, prefix=settings.API_STR)
app.include_router(finances.router, prefix=settings.API_STR)
app.include_router(requests.router, prefix=settings.API_STR)
app.include_router(rendezvous.router, prefix=settings.API_STR)
app.include_router(annees.router, prefix=settings.API_STR)
app.include_router(salles.router, prefix=settings.API_STR)
app.include_router(courriers.router, prefix=settings.API_STR)
app.include_router(stocks.router, prefix=settings.API_STR)
app.include_router(taches.router, prefix=settings.API_STR)
app.include_router(archives.router, prefix=settings.API_STR)
app.include_router(uploads.router, prefix=settings.API_STR)
app.include_router(transport.router, prefix=settings.API_STR)
app.include_router(echeancier.router, prefix=settings.API_STR)
app.include_router(caisse.router, prefix=settings.API_STR)
app.include_router(bank.router, prefix=settings.API_STR)
app.include_router(villes.router, prefix=settings.API_STR)
app.include_router(bibliotheque.router, prefix=settings.API_STR)
app.include_router(dossiers.router, prefix=settings.API_STR)
app.include_router(rh_demandes.router, prefix=settings.API_STR)
app.include_router(badges_qr.router, prefix=settings.API_STR)
app.include_router(reductions.router, prefix=settings.API_STR)
app.include_router(tenues.router, prefix=settings.API_STR)
app.include_router(parcauto.router, prefix=settings.API_STR)
app.include_router(audit.router, prefix=settings.API_STR)
app.include_router(tarifs.router, prefix=settings.API_STR)
app.include_router(pointage_badge.router, prefix=settings.API_STR)
app.include_router(periodes.router, prefix=settings.API_STR)

# ─── Fichiers statiques (photos & assets école) ───────────────────────────
# Rendre accessibles les images uploadées via /api/uploads/...
_uploads_root = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(os.path.join(_uploads_root, "photos"), exist_ok=True)
os.makedirs(os.path.join(_uploads_root, "school_assets", "logos"), exist_ok=True)
os.makedirs(os.path.join(_uploads_root, "school_assets", "signatures"), exist_ok=True)
os.makedirs(os.path.join(_uploads_root, "school_assets", "cachets"), exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=os.path.abspath(_uploads_root)), name="uploads")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to HINNEH ÉDUCATION API Backend",
        "documentation": "/docs",
        "status": "online"
    }

# ─── Empreinte du code réellement chargé ──────────────────────────────────
# Un backend Python ne se recharge pas tout seul : après un envoi de fichiers sur
# le serveur, le processus continue de servir le code qu'il a en mémoire depuis son
# démarrage. On obtient alors des 404 sur des routes qui existent pourtant dans les
# sources. Cette empreinte, calculée une seule fois à l'import, permet de vérifier
# depuis un navigateur que le code en ligne est bien celui qui vient d'être déployé :
# si elle ne change pas après un déploiement, c'est que le service n'a pas redémarré.
def _empreinte_code() -> str:
    racine = os.path.dirname(__file__)
    marqueurs = []
    for dossier, _, fichiers in os.walk(racine):
        for nom in sorted(fichiers):
            if not nom.endswith(".py"):
                continue
            chemin = os.path.join(dossier, nom)
            try:
                infos = os.stat(chemin)
            except OSError:
                continue
            marqueurs.append(f"{os.path.relpath(chemin, racine)}:{infos.st_size}")
    return hashlib.sha256("|".join(marqueurs).encode("utf-8")).hexdigest()[:12]


EMPREINTE_CODE = _empreinte_code()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "database_driver": str(engine.url.drivername),
        "database_name": str(engine.url.database),
        "database_host": str(engine.url.host),
        "empreinte_code": EMPREINTE_CODE,
        "nb_routes": len(app.routes),
    }


@app.get("/api/db-status")
def db_status():
    """Endpoint de diagnostic pour vérifier la connexion à la base de données MySQL de production."""
    from sqlalchemy import text
    driver = str(engine.url.drivername)
    host = str(engine.url.host)
    database = str(engine.url.database)
    user = str(engine.url.username)

    result = {
        "engine_driver": driver,
        "database_name": database,
        "database_host": host,
        "database_user": user,
        "is_mysql": "mysql" in driver,
        "app_env": os.getenv("APP_ENV", "production"),
        "connected": False,
        "counts": {},
        "error": None
    }

    try:
        with engine.connect() as conn:
            result["connected"] = True
            for table_name in ["user_educ", "so_etablissement", "api_classe", "api_eleve", "api_personnel", "api_grille_tarifaire", "api_echeancier", "api_paiement"]:
                try:
                    count_val = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                    result["counts"][table_name] = count_val
                except Exception as tbl_err:
                    result["counts"][table_name] = f"Table absente ou inaccessible: {tbl_err}"
    except Exception as e:
        result["connected"] = False
        result["error"] = str(e)

    return result
