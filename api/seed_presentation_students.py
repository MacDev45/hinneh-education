import sqlite3
import random
from datetime import date, datetime

def seed_data():
    conn = sqlite3.connect('api/school_educ.db')
    c = conn.cursor()

    # 1. Vérifier et insérer l'établissement 240477 (Korhogo) s'il n'existe pas
    c.execute("SELECT IDETABLISSEMENT FROM so_etablissement WHERE ET_CODEETABLISSEMENT = '240477'")
    row = c.fetchone()
    if not row:
        c.execute("""
            INSERT INTO so_etablissement 
            (IDETABLISSEMENT, ET_DENOMMINATION, ET_CODEETABLISSEMENT, ET_REGION, ET_VILLE, ET_ADRESSE_POSTALE, ET_CONTACTS, ET_EMAIL, ET_CYCLES, ET_STATUT, ET_EFFECTIF_CLASSE, ET_NOMBRECLASSES, ET_NOMBREPERSONNEL, ET_SCOREPERFORMANCE, ET_TAUXPRESENCE, ET_TAUXRECOUVREMENT, ET_DATECREATION)
            VALUES 
            (9, 'Fondation Hinneh Korhogo', '240477', 'Savanes', 'Korhogo', 'BP 240 Korhogo', '+225 27 36 86 00 00', 'korhogo@hinneh.ci', '["college", "lycee"]', 'actif', 30, 6, 12, 90.0, 95.0, 88.0, '2026-08-25')
        """)
        conn.commit()

    # 2. Classes à assurer
    classes_config = [
        # (Libellé, Code, Niveau, Cycle, ecole_id, code_etab, ordre)
        ('6ème 1', '6EME-1', '6EME', 'Collège', 1, 'FHA-01', 1),
        ('6ème 2', '6EME-2', '6EME', 'Collège', 1, 'FHA-01', 2),
        ('5ème 1', '5EME-1', '5EME', 'Collège', 1, 'FHA-01', 3),
        ('5ème 2', '5EME-2', '5EME', 'Collège', 1, 'FHA-01', 4),
        ('4ème 1', '4EME-1', '4EME', 'Collège', 1, 'FHA-01', 5),
        ('4ème 2', '4EME-2', '4EME', 'Collège', 1, 'FHA-01', 6),
        ('6ème A', '6EME-A-KOR', '6EME', 'Collège', 9, '240477', 1),
        ('5ème A', '5EME-A-KOR', '5EME', 'Collège', 9, '240477', 2),
        ('4ème A', '4EME-A-KOR', '4EME', 'Collège', 9, '240477', 3),
    ]

    class_dict = {}
    for lib, code, niv, cyc, ecole_id, code_etab, ordre in classes_config:
        c.execute("SELECT id FROM api_classe WHERE CE_LIBELLE = ? AND (ecole_id = ? OR ET_CODEETABLISSEMENT = ?)", (lib, ecole_id, code_etab))
        r = c.fetchone()
        if r:
            class_dict[(lib, code_etab)] = r[0]
        else:
            c.execute("""
                INSERT INTO api_classe 
                (
                    CE_LIBELLE, CE_CODECLASSE, CE_LIBELLENIVEAU, CY_LIBELLECYCLE, NI_CODENIVEAU,
                    ecole_id, ET_CODEETABLISSEMENT, capacite, CE_EFFECTIF, date_creation,
                    CE_ORDRE, CE_REMPLIE, CE_LV2ALL, CE_LV2ESP, CE_NATURECLASSE, TOPCONDUITE
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 35, 10, datetime('now'), ?, 0, 0, 0, 1, 0)
            """, (lib, code, niv, cyc, niv, ecole_id, code_etab, ordre))
            class_dict[(lib, code_etab)] = c.lastrowid

    conn.commit()

    prenoms_garcons = [
        "Mohamed", "Ibrahim", "Abdoulaye", "Kouassi", "Yao", "Mamadou", "Sekou", 
        "Jean-Eudes", "Bakary", "Oumar", "Emmanuel", "David", "Kouamé", "Seydou", 
        "Alexandre", "Brice", "Cheick", "Ismaël", "Stéphane", "Junior", "Yves"
    ]
    prenoms_filles = [
        "Awa", "Aminata", "Fatim", "Marie", "Aya", "Affoué", "Kady", "Mariam", 
        "Grace", "Bintou", "Salimata", "Christelle", "Nafissatou", "Sarah", 
        "Victoire", "Esther", "Aïcha", "Fatoumata", "Danielle", "Emmanuelle"
    ]
    noms_famille = [
        "KOUAME", "KOUASSI", "KONE", "TOURE", "TRAORE", "DIABATE", "BAMBA", 
        "COULIBALY", "OUATTARA", "CISSE", "FADIKA", "SANOGO", "YAO", "N'GORAN", 
        "DIALLO", "BAKAYOKO", "MEITE", "SORO", "SILUE", "KAMAGATE", "N'GUESSAN"
    ]

    quartiers_abidjan = ["Cocody Angré", "Abobo Baoulé", "Yopougon Selmer", "Riviera Palmeraie", "Deux Plateaux", "Marcory Zone 4"]
    quartiers_korhogo = ["Quartier 14", "Koko", "Sinistré", "Soba", "Haoussa", "Belle Ville"]

    level_birth_years = {
        '6EME': (2014, 2015),
        '5EME': (2013, 2014),
        '4EME': (2012, 2013),
    }

    # Supprimer les anciens élèves de démo pour éviter les doublons
    c.execute("DELETE FROM api_eleve WHERE matricule LIKE 'DEMO-%'")
    c.execute("DELETE FROM api_echeancier WHERE eleve_id NOT IN (SELECT id FROM api_eleve)")
    c.execute("DELETE FROM api_paiement WHERE eleve_id NOT IN (SELECT id FROM api_eleve)")
    conn.commit()

    total_created = 0

    for (lib, code_etab), cls_id in class_dict.items():
        niv = '6EME' if '6' in lib else ('5EME' if '5' in lib else '4EME')
        by_min, by_max = level_birth_years[niv]
        is_korhogo = (code_etab == '240477')
        quartiers = quartiers_korhogo if is_korhogo else quartiers_abidjan
        ecole_id = 9 if is_korhogo else 1
        clean_lib = lib.replace(' ', '').replace('ème', 'E').replace('è', 'E')
        prefix_mat = f"DEMO-{code_etab}-{clean_lib}"

        for i in range(1, 11):
            genre = 'M' if i % 2 == 1 else 'F'
            prenom = random.choice(prenoms_garcons if genre == 'M' else prenoms_filles)
            nom = random.choice(noms_famille)
            matricule = f"{prefix_mat}-{i:02d}"

            b_year = random.randint(by_min, by_max)
            b_month = random.randint(1, 12)
            b_day = random.randint(1, 28)
            dob = f"{b_year}-{b_month:02d}-{b_day:02d}"

            quartier = random.choice(quartiers)
            tel_parent = f"+225 07{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}"
            nom_pere = f"M. {nom} {random.choice(prenoms_garcons)}"
            nom_mere = f"Mme {random.choice(noms_famille)} {random.choice(prenoms_filles)}"

            scolarite_due = 220000.0
            if i <= 4:
                total_depot = 220000.0
            elif i <= 8:
                total_depot = 110000.0 if i % 2 == 0 else 160000.0
            else:
                total_depot = 50000.0 if i == 9 else 0.0

            solde_compte = scolarite_due - total_depot
            solde = total_depot - scolarite_due

            service_transport = 1 if i in (1, 3, 5, 7) else 0
            service_cantine = 1 if i in (2, 3, 6, 7, 8) else 0

            moyenne = round(random.uniform(10.5, 17.8), 2)
            rang = i

            c.execute("""
                INSERT INTO api_eleve 
                (
                    matricule, prenom, nom, date_naissance, genre,
                    ecole_id, classe_id, statut, solde, moyenne, rang,
                    ET_CODEETABLISSEMENT, AU_LIEU_NAISSANCE, AU_ADRESSE_GEO, AU_CONTACTS,
                    AU_PERENOMPRENOMS, AU_PERECONTACTS, AU_MERENOMPRENOMS, AU_MERECONTACTS,
                    AU_TUTEURLEGAL, AU_TUTEURLEGALCONTACTS, AU_NATIONALITE,
                    AU_SCOLARITE, AU_TOTALDEPOT, AU_SOLDECOMPTE, AU_MONTANTARRIERE, AU_TOTALRETRAIT,
                    REDOUBLANT, ETAT_BOURSE, AU_HANDICAP, AU_TYPEHANDICAP, AU_TOP_AFFECTE, AU_TOP_CREATION,
                    AU_CIVILITEURGENCE, AU_STATUTPENSION, AU_NATIONAL, AU_ETRANGERCONTINENT, AU_ETRANGERHORSCONTINENT,
                    AU_LIENCIVILITE, AU_TYPEBOURSE, AU_LIEURESIDENCE, AU_STATUT, IMPORTE,
                    parent_password, parent_password_changed,
                    step_1_validated, step_2_validated, step_3_validated, step_4_validated,
                    step_5_validated, step_6_validated, step_7_validated, step_8_validated,
                    step_9_validated, step_10_validated, step_11_validated,
                    tenue_validee, kit_depose, kit_rame_papier, kit_papier_hygienique, kit_marqueurs_tableau,
                    service_transport, service_cantine, type_inscription, qualite_eleve, statut_orientation,
                    montant_versement, date_creation, date_inscription
                )
                VALUES 
                (
                    ?, ?, ?, ?, ?,
                    ?, ?, 'actif', ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, 'Ivoirienne',
                    ?, ?, ?, 0.0, 0.0,
                    0, 0, 0, 0, 1, 0,
                    1, 1, 1, 0, 0,
                    1, 0, 1, 1, 0,
                    'demo1234', 0,
                    1, 1, 1, 1,
                    1, 1, 1, 1,
                    1, 1, 1,
                    1, 1, 1, 1, 1,
                    ?, ?, 'reinscription', 'affecte', ?,
                    ?, datetime('now'), datetime('now')
                )
            """, (
                matricule, prenom, nom, dob, genre,
                ecole_id, cls_id, solde, moyenne, rang,
                code_etab, 'Abidjan' if not is_korhogo else 'Korhogo', quartier, tel_parent,
                nom_pere, tel_parent, nom_mere, tel_parent,
                nom_pere, tel_parent,
                scolarite_due, total_depot, solde_compte,
                service_transport, service_cantine,
                "Affecté par l'État",
                total_depot
            ))

            eleve_id = c.lastrowid
            total_created += 1

            if total_depot > 0:
                recu_num = f"RC-2026-{eleve_id:04d}"
                c.execute("""
                    INSERT INTO api_paiement
                    (montant, type, mode, statut, date, numero_recu, eleve_id, ecole_id, ET_CODEETABLISSEMENT, frais_annexe_valide, date_creation)
                    VALUES (?, 'scolarite', 'especes', 'paye', datetime('now'), ?, ?, ?, ?, 0, datetime('now'))
                """, (total_depot, recu_num, eleve_id, ecole_id, code_etab))

            tranches = [
                ('1ère Tranche — Inscription & Rentrée', 100000.0, '2026-09-05'),
                ('2ème Tranche — Trimestre 1', 60000.0, '2026-11-05'),
                ('3ème Tranche — Trimestre 2', 60000.0, '2027-01-05'),
            ]
            rest_to_allocate = total_depot
            for idx, (t_lib, t_mont, t_date) in enumerate(tranches, 1):
                t_paye = min(rest_to_allocate, t_mont)
                rest_to_allocate -= t_paye
                t_statut = 'paye' if t_paye >= t_mont else ('partiel' if t_paye > 0 else 'non_paye')

                c.execute("""
                    INSERT INTO api_echeancier
                    (eleve_id, libelle, tranche_numero, montant_prevu, montant_paye, date_echeance, statut, annee_scolaire, service_type, ecole_id, ET_CODEETABLISSEMENT, date_creation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, '2026-2027', 'scolarite', ?, ?, datetime('now'))
                """, (eleve_id, t_lib, idx, t_mont, t_paye, t_date, t_statut, ecole_id, code_etab))

            if service_cantine:
                c.execute("""
                    INSERT INTO api_echeancier
                    (eleve_id, libelle, tranche_numero, montant_prevu, montant_paye, date_echeance, statut, annee_scolaire, service_type, ecole_id, ET_CODEETABLISSEMENT, date_creation)
                    VALUES (?, 'Cantine Mensuelle — Octobre', 1, 15000.0, 15000.0, '2026-10-05', 'paye', '2026-2027', 'cantine', ?, ?, datetime('now'))
                """, (eleve_id, ecole_id, code_etab))

            if service_transport:
                c.execute("""
                    INSERT INTO api_echeancier
                    (eleve_id, libelle, tranche_numero, montant_prevu, montant_paye, date_echeance, statut, annee_scolaire, service_type, ecole_id, ET_CODEETABLISSEMENT, date_creation)
                    VALUES (?, 'Transport Scolaire — Octobre', 1, 20000.0, 20000.0, '2026-10-05', 'paye', '2026-2027', 'transport', ?, ?, datetime('now'))
                """, (eleve_id, ecole_id, code_etab))

    conn.commit()
    conn.close()
    print(f"=== SUCCÈS : {total_created} élèves créés pour la présentation (6e, 5e, 4e) ! ===")

if __name__ == '__main__':
    seed_data()
