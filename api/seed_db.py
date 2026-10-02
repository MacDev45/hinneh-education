import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal

# Add parent directory of backend/app to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models, crud

def seed():
    print("Initializing Database Seeding...")
    
    # Ensure tables and columns exist
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        
        columns_attribution = [c['name'] for c in inspector.get_columns("api_attributionmatiere")]
        if columns_attribution and "groupe" not in columns_attribution:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE api_attributionmatiere ADD COLUMN groupe VARCHAR(50) DEFAULT 'Classe entière'"))
                conn.commit()
                print("Schema migration (seed): Added groupe column to api_attributionmatiere.")
                
        columns_matiere = [c['name'] for c in inspector.get_columns("api_matiere")]
        if columns_matiere and "parent_id" not in columns_matiere:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE api_matiere ADD COLUMN parent_id INTEGER REFERENCES api_matiere(id)"))
                conn.commit()
                print("Schema migration (seed): Added parent_id column to api_matiere.")

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
                    print("Schema migration (seed): Added new columns to api_evaluation.")

        # api_presence updates
        columns_presence = [c['name'] for c in inspector.get_columns("api_presence")]
        if columns_presence and "heure" not in columns_presence:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE api_presence ADD COLUMN heure VARCHAR(50)"))
                conn.commit()
                print("Schema migration (seed): Added heure column to api_presence.")
    except Exception as migration_error:
        print(f"Schema migration warning in seed: {migration_error}")

    db = SessionLocal()
    
    # 1. Clean existing tables
    print("Cleaning old records...")
    from sqlalchemy import text
    is_mysql = "mysql" in str(engine.url)
    if is_mysql:
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
    else:
        db.execute(text("PRAGMA foreign_keys = OFF;"))
    db.commit()

    db.query(models.Paiement).delete()
    db.query(models.Evaluation).delete()
    db.query(models.Presence).delete()
    db.query(models.DemandeTraitement).delete()
    db.query(models.Bulletin).delete()
    db.query(models.Eleve).delete()
    db.query(models.AttributionMatiere).delete()
    db.query(models.Classe).delete()
    db.query(models.Personnel).delete()
    db.query(models.Matiere).delete()
    db.query(models.Niveau).delete()
    db.query(models.Cycle).delete()
    db.query(models.CustomUser).delete()
    db.query(models.Etablissement).delete()
    db.commit()

    if is_mysql:
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
    else:
        db.execute(text("PRAGMA foreign_keys = ON;"))
    db.commit()

    # 2. Seed Custom Users (for Auth)
    print("Seeding Custom Users...")
    users = [
        models.CustomUser(
            id=1,
            username="direction@hinneh.ci",
            email="direction@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Amadou",
            last_name="Kone",
            is_superuser=True,
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=2,
            username="tout@hinneh.ci",
            email="tout@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Voir",
            last_name="Tout",
            is_superuser=True,
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=3,
            username="directeur@hinneh.ci",
            email="directeur@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Mamadou",
            last_name="Cisse",
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=4,
            username="enseignant@hinneh.ci",
            email="enseignant@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Souleymane",
            last_name="Coulibaly",
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=5,
            username="mariam.kone@hinneh.ci",
            email="mariam.kone@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Mariam",
            last_name="Kone",
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=6,
            username="comptable@hinneh.ci",
            email="comptable@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Fatoumata",
            last_name="Diallo",
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=7,
            username="rh@hinneh.ci",
            email="rh@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Aminata",
            last_name="Traore",
            is_staff=True,
            is_active=True
        ),
        models.CustomUser(
            id=8,
            username="admin@hinneh.ci",
            email="admin@hinneh.ci",
            password=crud.get_password_hash("dev2026"),
            first_name="Système",
            last_name="Admin",
            is_superuser=True,
            is_staff=True,
            is_active=True
        )
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 3. Seed Cycles
    print("Seeding Cycles...")
    cycles = {
        "maternelle": models.Cycle(libelle="Maternelle", code="MATERNELLE", actif=True, ordre=1),
        "primaire": models.Cycle(libelle="Primaire", code="PRIMAIRE", actif=True, ordre=2),
        "college": models.Cycle(libelle="Collège", code="COLLEGE", actif=True, ordre=3),
        "lycee": models.Cycle(libelle="Lycée", code="LYCEE", actif=True, ordre=4),
    }
    for c in cycles.values():
        db.add(c)
    db.commit()

    # 4. Seed Niveaux
    print("Seeding Niveaux...")
    niveaux = [
        # Maternelle
        models.Niveau(libelle="Petite Section", code="PS", actif=True, ordre=1, cycle_id=cycles["maternelle"].id, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
        models.Niveau(libelle="Moyenne Section", code="MS", actif=True, ordre=2, cycle_id=cycles["maternelle"].id, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
        models.Niveau(libelle="Grande Section", code="GS", actif=True, ordre=3, cycle_id=cycles["maternelle"].id, scolarite=Decimal("50000.00"), droit_inscription=Decimal("10000.00")),
        # Primaire
        models.Niveau(libelle="CP1", code="CP1", actif=True, ordre=4, cycle_id=cycles["primaire"].id, scolarite=Decimal("75000.00"), droit_inscription=Decimal("15000.00")),
        models.Niveau(libelle="CP2", code="CP2", actif=True, ordre=5, cycle_id=cycles["primaire"].id, scolarite=Decimal("75000.00"), droit_inscription=Decimal("15000.00")),
        models.Niveau(libelle="CE1", code="CE1", actif=True, ordre=6, cycle_id=cycles["primaire"].id, scolarite=Decimal("80000.00"), droit_inscription=Decimal("15000.00")),
        models.Niveau(libelle="CE2", code="CE2", actif=True, ordre=7, cycle_id=cycles["primaire"].id, scolarite=Decimal("80000.00"), droit_inscription=Decimal("15000.00")),
        models.Niveau(libelle="CM1", code="CM1", actif=True, ordre=8, cycle_id=cycles["primaire"].id, scolarite=Decimal("90000.00"), droit_inscription=Decimal("15000.00")),
        models.Niveau(libelle="CM2", code="CM2", actif=True, ordre=9, cycle_id=cycles["primaire"].id, scolarite=Decimal("90000.00"), droit_inscription=Decimal("20000.00")),
        # Collège
        models.Niveau(libelle="6ème", code="6EME", actif=True, ordre=10, cycle_id=cycles["college"].id, scolarite=Decimal("120000.00"), droit_inscription=Decimal("25000.00")),
        models.Niveau(libelle="5ème", code="5EME", actif=True, ordre=11, cycle_id=cycles["college"].id, scolarite=Decimal("120000.00"), droit_inscription=Decimal("25000.00")),
        models.Niveau(libelle="4ème", code="4EME", actif=True, ordre=12, cycle_id=cycles["college"].id, scolarite=Decimal("130000.00"), droit_inscription=Decimal("25000.00")),
        models.Niveau(libelle="3ème", code="3EME", actif=True, ordre=13, cycle_id=cycles["college"].id, scolarite=Decimal("140000.00"), droit_inscription=Decimal("30000.00")),
        # Lycée
        models.Niveau(libelle="Seconde", code="2ND", actif=True, ordre=14, cycle_id=cycles["lycee"].id, scolarite=Decimal("160000.00"), droit_inscription=Decimal("30000.00")),
        models.Niveau(libelle="Première", code="1ERE", actif=True, ordre=15, cycle_id=cycles["lycee"].id, scolarite=Decimal("170000.00"), droit_inscription=Decimal("30000.00")),
        models.Niveau(libelle="Terminale", code="TERM", actif=True, ordre=16, cycle_id=cycles["lycee"].id, scolarite=Decimal("180000.00"), droit_inscription=Decimal("35000.00")),
    ]
    for n in niveaux:
        db.add(n)
    db.commit()

    # Find loaded niveau IDs for referencing
    niveau_map = {n.code: n.id for n in niveaux}

    # 5. Seed Schools
    print("Seeding Schools (Établissements)...")
    schools_data = [
        {
            "ET_DENOMMINATION": "Fondation Hinneh Abidjan",
            "ET_CODEETABLISSEMENT": "FHA-01",
            "ET_REGION": "Lagunes",
            "ET_VILLE": "Abidjan",
            "ET_ADRESSE_POSTALE": "BP 456 Abidjan",
            "ET_CONTACTS": "+225 27 22 44 55 66",
            "ET_EMAIL": "abidjan@hinneh.ci",
            "ET_CYCLES": ["maternelle", "primaire", "college", "lycee"],
            "ET_STATUT": "actif",
            "ET_EFFECTIF_CLASSE": 120,
            "ET_NOMBRECLASSES": 4,
            "ET_NOMBREPERSONNEL": 5,
            "ET_SCOREPERFORMANCE": 88.5,
            "ET_TAUXPRESENCE": 94.2,
            "ET_TAUXRECOUVREMENT": 85.0
        },
        {
            "ET_DENOMMINATION": "Institut El Fath Bouaké",
            "ET_CODEETABLISSEMENT": "IEF-02",
            "ET_REGION": "Vallée du Bandama",
            "ET_VILLE": "Bouaké",
            "ET_ADRESSE_POSTALE": "BP 789 Bouaké",
            "ET_CONTACTS": "+225 27 31 63 12 14",
            "ET_EMAIL": "bouake@hinneh.ci",
            "ET_CYCLES": ["primaire", "college"],
            "ET_STATUT": "actif",
            "ET_EFFECTIF_CLASSE": 85,
            "ET_NOMBRECLASSES": 3,
            "ET_NOMBREPERSONNEL": 3,
            "ET_SCOREPERFORMANCE": 76.0,
            "ET_TAUXPRESENCE": 89.5,
            "ET_TAUXRECOUVREMENT": 78.4
        },
        {
            "ET_DENOMMINATION": "Lycée Islamique Yamoussoukro",
            "ET_CODEETABLISSEMENT": "LIY-03",
            "ET_REGION": "Yamoussoukro",
            "ET_VILLE": "Yamoussoukro",
            "ET_ADRESSE_POSTALE": "BP 12 Yamoussoukro",
            "ET_CONTACTS": "+225 27 30 64 15 16",
            "ET_EMAIL": "yakro@hinneh.ci",
            "ET_CYCLES": ["college", "lycee"],
            "ET_STATUT": "actif",
            "ET_EFFECTIF_CLASSE": 150,
            "ET_NOMBRECLASSES": 5,
            "ET_NOMBREPERSONNEL": 6,
            "ET_SCOREPERFORMANCE": 91.2,
            "ET_TAUXPRESENCE": 96.0,
            "ET_TAUXRECOUVREMENT": 92.1
        }
    ]
    
    schools = []
    for s_data in schools_data:
        s = models.Etablissement(**s_data)
        db.add(s)
        schools.append(s)
    db.commit()

    # 6. Seed Personnel (Staff)
    print("Seeding Personnel...")
    staff_members = [
        models.Personnel(
            prenom="Souleymane",
            nom="Coulibaly",
            email="enseignant@hinneh.ci",
            telephone="+225 07 48 55 66 77",
            fonction="enseignant",
            statut="actif",
            charge_horaire=18,
            ecole_id=schools[0].IDETABLISSEMENT,
            user_id=db.query(models.CustomUser).filter(models.CustomUser.username == "enseignant@hinneh.ci").first().id,
            score_evaluation=4.5
        ),
        models.Personnel(
            prenom="Mariam",
            nom="Kone",
            email="mariam.kone@hinneh.ci",
            telephone="+225 07 12 12 12 12",
            fonction="enseignant",
            statut="actif",
            charge_horaire=18,
            ecole_id=schools[0].IDETABLISSEMENT,
            user_id=db.query(models.CustomUser).filter(models.CustomUser.username == "mariam.kone@hinneh.ci").first().id,
            score_evaluation=4.6
        ),
        models.Personnel(
            prenom="Mamadou",
            nom="Cisse",
            email="directeur@hinneh.ci",
            telephone="+225 05 12 34 56 78",
            fonction="direction",
            statut="actif",
            charge_horaire=40,
            ecole_id=schools[0].IDETABLISSEMENT,
            user_id=db.query(models.CustomUser).filter(models.CustomUser.username == "directeur@hinneh.ci").first().id,
            score_evaluation=4.8
        ),
        models.Personnel(
            prenom="Fatoumata",
            nom="Diallo",
            email="comptable@hinneh.ci",
            telephone="+225 01 02 03 04 05",
            fonction="comptable",
            statut="actif",
            charge_horaire=35,
            ecole_id=schools[0].IDETABLISSEMENT,
            user_id=db.query(models.CustomUser).filter(models.CustomUser.username == "comptable@hinneh.ci").first().id,
            score_evaluation=4.2
        ),
        models.Personnel(
            prenom="Koffi",
            nom="Yao",
            email="koffi.yao@hinneh.ci",
            telephone="+225 08 09 10 11 12",
            fonction="enseignant",
            statut="actif",
            charge_horaire=20,
            ecole_id=schools[1].IDETABLISSEMENT,
            score_evaluation=3.9
        )
    ]
    for st in staff_members:
        db.add(st)
    db.commit()

    # 7. Seed Matieres (Subjects)
    print("Seeding Matieres...")
    
    # First seed main disciplines
    math = models.Matiere(libelle="Mathématiques", code="MATH", actif=True)
    anglais = models.Matiere(libelle="Anglais", code="ANG", actif=True)
    phys = models.Matiere(libelle="Physique-Chimie", code="PHYS", actif=True)
    hg = models.Matiere(libelle="Histoire-Géographie", code="HG", actif=True)
    islam = models.Matiere(libelle="Éducation Islamique", code="ISLAM", actif=True)
    svt = models.Matiere(libelle="Sciences de la Vie et de la Terre", code="SVT", actif=True)
    eps = models.Matiere(libelle="EPS", code="EPS", actif=True)
    
    # Disciplines parentes
    francais = models.Matiere(libelle="Français", code="FRAN", actif=True)
    lv2 = models.Matiere(libelle="Langue Vivante 2", code="LV2", actif=True)
    
    db.add_all([math, anglais, phys, hg, islam, svt, eps, francais, lv2])
    db.commit()
    
    # Seed child subjects
    grammaire = models.Matiere(libelle="Grammaire", code="FRAN_GRAM", actif=True, parent_id=francais.id)
    resume = models.Matiere(libelle="Résumé", code="FRAN_RES", actif=True, parent_id=francais.id)
    composition = models.Matiere(libelle="Composition", code="FRAN_COMP", actif=True, parent_id=francais.id)
    
    espagnol = models.Matiere(libelle="Espagnol", code="LV2_ESP", actif=True, parent_id=lv2.id)
    allemand = models.Matiere(libelle="Allemand", code="LV2_ALL", actif=True, parent_id=lv2.id)
    
    db.add_all([grammaire, resume, composition, espagnol, allemand])
    db.commit()

    # Add all to flat list for backward compatibility
    subjects = [math, francais, anglais, phys, hg, islam, svt, eps, lv2, grammaire, resume, composition, espagnol, allemand]

    # 8. Seed Classes
    print("Seeding Classes...")
    classes = [
        models.Classe(
            CE_LIBELLE="6ème A",
            CE_CODECLASSE="6EME-A",
            capacite=40,
            cycle_id=cycles["college"].id,
            ecole_id=schools[0].IDETABLISSEMENT,
            niveau_id=niveau_map["6EME"],
            enseignant_id=staff_members[0].id,
            CE_EFFECTIF=3
        ),
        models.Classe(
            CE_LIBELLE="3ème B",
            CE_CODECLASSE="3EME-B",
            capacite=35,
            cycle_id=cycles["college"].id,
            ecole_id=schools[0].IDETABLISSEMENT,
            niveau_id=niveau_map["3EME"],
            enseignant_id=staff_members[0].id,
            CE_EFFECTIF=2
        ),
        models.Classe(
            CE_LIBELLE="Terminale D",
            CE_CODECLASSE="TERM-D",
            capacite=30,
            cycle_id=cycles["lycee"].id,
            ecole_id=schools[2].IDETABLISSEMENT,
            niveau_id=niveau_map["TERM"],
            enseignant_id=staff_members[0].id,
            CE_EFFECTIF=2
        )
    ]
    for cl in classes:
        db.add(cl)
    db.commit()

    # 9. Seed Eleves (Students)
    print("Seeding Eleves (Students)...")
    students = [
        models.Eleve(
            matricule="HE20260001",
            prenom="Kouassi",
            nom="Yao",
            date_naissance=date(2012, 5, 14),
            genre="M",
            ecole_id=schools[0].IDETABLISSEMENT,
            classe_id=classes[0].id,
            statut="actif",
            solde=Decimal("-15000.00"),
            moyenne=14.5,
            rang=1,
            notes_sante="Aucune allergie signalée.",
            AU_E_MAIL="parent.yao@email.ci",
            AU_CONTACTS="+225 07 88 99 00 11",
            AU_QUARTIER="Cocody",
            parent_password=crud.get_password_hash("parentpassword123"),
            MA_LV2="ESP",
            AU_LANGUEVIVANTE2="Espagnol"
        ),
        models.Eleve(
            matricule="HE20260002",
            prenom="Aya",
            nom="Kouamé",
            date_naissance=date(2013, 8, 22),
            genre="F",
            ecole_id=schools[0].IDETABLISSEMENT,
            classe_id=classes[0].id,
            statut="actif",
            solde=Decimal("0.00"),
            moyenne=13.2,
            rang=2,
            AU_E_MAIL="parent.kouame@email.ci",
            AU_CONTACTS="+225 05 44 33 22 11",
            AU_QUARTIER="Marcory",
            parent_password=crud.get_password_hash("parentpassword123"),
            MA_LV2="ALL",
            AU_LANGUEVIVANTE2="Allemand"
        ),
        models.Eleve(
            matricule="HE20260003",
            prenom="Mamadou",
            nom="Koné",
            date_naissance=date(2012, 11, 2),
            genre="M",
            ecole_id=schools[0].IDETABLISSEMENT,
            classe_id=classes[0].id,
            statut="actif",
            solde=Decimal("-25000.00"),
            moyenne=11.8,
            rang=3,
            AU_E_MAIL="parent.kone@email.ci",
            AU_CONTACTS="+225 01 77 88 99 00",
            AU_QUARTIER="Yopougon",
            parent_password=crud.get_password_hash("parentpassword123"),
            MA_LV2="ESP",
            AU_LANGUEVIVANTE2="Espagnol"
        ),
        models.Eleve(
            matricule="HE20260004",
            prenom="Aminata",
            nom="Touré",
            date_naissance=date(2010, 2, 28),
            genre="F",
            ecole_id=schools[0].IDETABLISSEMENT,
            classe_id=classes[1].id,
            statut="actif",
            solde=Decimal("0.00"),
            moyenne=15.8,
            rang=1,
            notes_sante="Asthme léger.",
            AU_E_MAIL="parent.toure@email.ci",
            AU_CONTACTS="+225 07 11 22 33 44",
            AU_QUARTIER="Plateau",
            parent_password=crud.get_password_hash("parentpassword123"),
            MA_LV2="ALL",
            AU_LANGUEVIVANTE2="Allemand"
        ),
        models.Eleve(
            matricule="HE20260005",
            prenom="Ibrahim",
            nom="Bamba",
            date_naissance=date(2010, 6, 15),
            genre="M",
            ecole_id=schools[0].IDETABLISSEMENT,
            classe_id=classes[1].id,
            statut="actif",
            solde=Decimal("0.00"),
            moyenne=14.0,
            rang=2,
            AU_E_MAIL="parent.bamba@email.ci",
            AU_CONTACTS="+225 05 55 66 77 88",
            AU_QUARTIER="Abobo",
            parent_password=crud.get_password_hash("parentpassword123"),
            MA_LV2="ESP",
            AU_LANGUEVIVANTE2="Espagnol"
        ),
        models.Eleve(
            matricule="HE20260006",
            prenom="Bakary",
            nom="Traoré",
            date_naissance=date(2008, 9, 30),
            genre="M",
            ecole_id=schools[2].IDETABLISSEMENT,
            classe_id=classes[2].id,
            statut="actif",
            solde=Decimal("0.00"),
            moyenne=16.2,
            rang=1,
            AU_E_MAIL="parent.traore@email.ci",
            AU_CONTACTS="+225 07 44 55 66 77",
            AU_QUARTIER="Cocody",
            parent_password=crud.get_password_hash("parentpassword123")
        ),
        models.Eleve(
            matricule="HE20260007",
            prenom="Fatoumata",
            nom="Cissé",
            date_naissance=date(2009, 12, 12),
            genre="F",
            ecole_id=schools[2].IDETABLISSEMENT,
            classe_id=classes[2].id,
            statut="actif",
            solde=Decimal("-50000.00"),
            moyenne=12.4,
            rang=2,
            AU_E_MAIL="parent.cisse@email.ci",
            AU_CONTACTS="+225 01 22 33 44 55",
            AU_QUARTIER="Marcory",
            parent_password=crud.get_password_hash("parentpassword123")
        )
    ]
    for s in students:
        db.add(s)
    db.commit()

    # 10. Seed Paiements
    print("Seeding Paiements...")
    payments = [
        models.Paiement(
            montant=Decimal("60000.00"),
            type="scolarite",
            mode="mobile_money",
            statut="paye",
            eleve_id=students[0].id,
            frais_annexe_valide=True,
            numero_transaction="TXN-2026A1"
        ),
        models.Paiement(
            montant=Decimal("15000.00"),
            type="inscription",
            mode="especes",
            statut="paye",
            eleve_id=students[0].id,
            frais_annexe_valide=False
        ),
        models.Paiement(
            montant=Decimal("80000.00"),
            type="scolarite",
            mode="virement",
            statut="paye",
            eleve_id=students[1].id,
            frais_annexe_valide=True,
            numero_transaction="TXN-2026B2"
        ),
        models.Paiement(
            montant=Decimal("50000.00"),
            type="scolarite",
            mode="mobile_money",
            statut="paye",
            eleve_id=students[2].id,
            frais_annexe_valide=True,
            numero_transaction="TXN-2026C3"
        ),
        models.Paiement(
            montant=Decimal("140000.00"),
            type="scolarite",
            mode="virement",
            statut="paye",
            eleve_id=students[3].id,
            frais_annexe_valide=True,
            numero_transaction="TXN-2026D4"
        ),
        models.Paiement(
            montant=Decimal("180000.00"),
            type="scolarite",
            mode="mobile_money",
            statut="paye",
            eleve_id=students[5].id,
            frais_annexe_valide=True,
            numero_transaction="TXN-2026E5"
        )
    ]
    for pay in payments:
        db.add(pay)
    db.commit()

    # 11. Seed Evaluations (Grades)
    print("Seeding Evaluations...")
    evaluations = [
        models.Evaluation(
            matiere="Mathématiques",
            type="devoir",
            trimestre=1,
            note=15.5,
            coefficient=2,
            date=date(2026, 4, 15),
            appreciation="Très bon travail !",
            classe_id=classes[0].id,
            eleve_id=students[0].id
        ),
        models.Evaluation(
            matiere="Français",
            type="devoir",
            trimestre=1,
            note=13.0,
            coefficient=1,
            date=date(2026, 4, 18),
            appreciation="En progrès.",
            classe_id=classes[0].id,
            eleve_id=students[0].id
        ),
        models.Evaluation(
            matiere="Mathématiques",
            type="devoir",
            trimestre=1,
            note=12.0,
            coefficient=2,
            date=date(2026, 4, 15),
            appreciation="Doit approfondir les leçons.",
            classe_id=classes[0].id,
            eleve_id=students[1].id
        ),
        models.Evaluation(
            matiere="Français",
            type="devoir",
            trimestre=1,
            note=14.5,
            coefficient=1,
            date=date(2026, 4, 18),
            appreciation="Bonne participation.",
            classe_id=classes[0].id,
            eleve_id=students[1].id
        )
    ]
    for ev in evaluations:
        db.add(ev)
    db.commit()

    # 12. Seed Presences (Attendance)
    print("Seeding Presences...")
    today = date.today()
    presences = [
        models.Presence(date=today - timedelta(days=2), statut="present", classe_id=classes[0].id, eleve_id=students[0].id),
        models.Presence(date=today - timedelta(days=1), statut="present", classe_id=classes[0].id, eleve_id=students[0].id),
        models.Presence(date=today, statut="present", classe_id=classes[0].id, eleve_id=students[0].id),
        
        models.Presence(date=today - timedelta(days=2), statut="present", classe_id=classes[0].id, eleve_id=students[1].id),
        models.Presence(date=today - timedelta(days=1), statut="absent", justification="Rendez-vous médical", classe_id=classes[0].id, eleve_id=students[1].id),
        models.Presence(date=today, statut="present", classe_id=classes[0].id, eleve_id=students[1].id),
    ]
    for pr in presences:
        db.add(pr)
    db.commit()

    # 13. Seed Attributions
    print("Seeding Attributions...")
    attributions = [
        # EPS 6ème A (Garçons -> Souleymane, Filles -> Mariam) - Lundi 08:00 - 10:00 (Simultané!)
        models.AttributionMatiere(
            classe_id=classes[0].id,
            enseignant_id=staff_members[0].id, # Souleymane
            matiere_id=eps.id,
            jour="Lundi",
            heure="08:00 - 10:00",
            salle="Terrain",
            statut="actif",
            groupe="Garçons"
        ),
        models.AttributionMatiere(
            classe_id=classes[0].id,
            enseignant_id=staff_members[4].id, # Mariam
            matiere_id=eps.id,
            jour="Lundi",
            heure="08:00 - 10:00",
            salle="Gymnase",
            statut="actif",
            groupe="Filles"
        ),
        
        # Français Grammaire & Résumé pour 6ème A (Grammaire -> Souleymane, Résumé -> Mariam)
        models.AttributionMatiere(
            classe_id=classes[0].id,
            enseignant_id=staff_members[0].id, # Souleymane
            matiere_id=grammaire.id,
            jour="Mardi",
            heure="10:30 - 12:30",
            salle="Salle 101",
            statut="actif",
            groupe="Classe entière"
        ),
        models.AttributionMatiere(
            classe_id=classes[0].id,
            enseignant_id=staff_members[4].id, # Mariam
            matiere_id=resume.id,
            jour="Jeudi",
            heure="10:30 - 12:30",
            salle="Salle 101",
            statut="actif",
            groupe="Classe entière"
        ),

        # LV2 Espagnol & Allemand pour 3ème B (Espagnol -> Souleymane, Allemand -> Mariam) - Mercredi 08:00 - 10:00 (Simultané!)
        models.AttributionMatiere(
            classe_id=classes[1].id,
            enseignant_id=staff_members[0].id, # Souleymane
            matiere_id=espagnol.id,
            jour="Mercredi",
            heure="08:00 - 10:00",
            salle="Salle 102",
            statut="actif",
            groupe="Espagnol"
        ),
        models.AttributionMatiere(
            classe_id=classes[1].id,
            enseignant_id=staff_members[4].id, # Mariam
            matiere_id=allemand.id,
            jour="Mercredi",
            heure="08:00 - 10:00",
            salle="Salle 103",
            statut="actif",
            groupe="Allemand"
        )
    ]
    for attr in attributions:
        db.add(attr)
    db.commit()

    print("\nDatabase seeded successfully!")
    db.close()

if __name__ == "__main__":
    seed()
