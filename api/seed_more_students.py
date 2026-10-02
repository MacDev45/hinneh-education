import sqlite3
import random
from datetime import date, datetime

def populate_students():
    conn = sqlite3.connect('api/school_educ.db')
    c = conn.cursor()

    today_str = date.today().isoformat() # '2026-08-26'

    # Clean existing dates
    c.execute("UPDATE api_eleve SET date_inscription = substr(date_inscription, 1, 10) WHERE length(date_inscription) > 10")
    c.execute("UPDATE api_eleve SET date_naissance = substr(date_naissance, 1, 10) WHERE length(date_naissance) > 10")
    conn.commit()

    # Fetch all classes
    c.execute("SELECT id, CE_LIBELLE, CE_CODECLASSE, ecole_id, ET_CODEETABLISSEMENT FROM api_classe")
    classes = c.fetchall()

    prenoms_garcons = [
        "Mohamed", "Ibrahim", "Abdoulaye", "Kouassi", "Yao", "Mamadou", "Sekou", 
        "Jean-Eudes", "Bakary", "Oumar", "Emmanuel", "David", "Kouamé", "Seydou", 
        "Alexandre", "Brice", "Cheick", "Ismaël", "Stéphane", "Junior", "Yves",
        "Amadou", "Souleymane", "Ali", "Hassan", "Hussein", "Karim", "Drissa",
        "Tidiane", "Lamine", "Moustapha", "Aziz", "Losseni", "Fousseni"
    ]
    prenoms_filles = [
        "Awa", "Aminata", "Fatim", "Marie", "Aya", "Affoué", "Kady", "Mariam", 
        "Grace", "Bintou", "Salimata", "Christelle", "Nafissatou", "Sarah", 
        "Victoire", "Esther", "Aïcha", "Fatoumata", "Danielle", "Emmanuelle",
        "Khadidiatou", "Ramatou", "Djénéba", "Rokiatou", "Assétou", "Fanta",
        "Maïmouna", "Zalika", "Sita", "Oumou", "Safiatou", "Nabintou"
    ]
    noms_famille = [
        "KOUAME", "KOUASSI", "KONE", "TOURE", "TRAORE", "DIABATE", "BAMBA", 
        "COULIBALY", "OUATTARA", "CISSE", "FADIKA", "SANOGO", "YAO", "N'GORAN", 
        "DIALLO", "BAKAYOKO", "MEITE", "SORO", "SILUE", "KAMAGATE", "N'GUESSAN",
        "DAGNOGO", "DOSSO", "BERTE", "KANTE", "FOFANA", "SYLLA", "TIMITE"
    ]

    quartiers = [
        "Cocody Angré", "Abobo Baoulé", "Yopougon Selmer", "Riviera Palmeraie", 
        "Deux Plateaux", "Marcory Zone 4", "Koko", "Belle Ville", "Dar-es-Salam"
    ]

    # Delete previous newly seeded batch if any to re-seed cleanly
    c.execute("DELETE FROM api_eleve WHERE matricule LIKE 'HE2026%' AND id > 1670")
    c.execute("DELETE FROM api_echeancier WHERE eleve_id NOT IN (SELECT id FROM api_eleve)")
    c.execute("DELETE FROM api_paiement WHERE eleve_id NOT IN (SELECT id FROM api_eleve)")
    conn.commit()

    total_added = 0

    # Ensure every class has at least 15 students
    for cls_id, cls_lib, cls_code, ecole_id, code_etab in classes:
        ecole_id = ecole_id or 1
        code_etab = code_etab or 'FHA-01'

        c.execute("SELECT COUNT(*) FROM api_eleve WHERE classe_id = ?", (cls_id,))
        count = c.fetchone()[0]

        needed = max(15 - count, 12 if cls_id in (1, 2, 3) else 0)

        print(f"Class {cls_id} ({cls_lib} - {code_etab}): current count = {count}, adding {needed} students...")

        for i in range(1, needed + 1):
            genre = 'M' if i % 2 == 1 else 'F'
            prenom = random.choice(prenoms_garcons if genre == 'M' else prenoms_filles)
            nom = random.choice(noms_famille)
            
            rand_id = random.randint(1000, 9999)
            matricule = f"HE2026{rand_id}{cls_id}{i:02d}"

            b_year = random.randint(2010, 2016)
            b_month = random.randint(1, 12)
            b_day = random.randint(1, 28)
            dob = f"{b_year}-{b_month:02d}-{b_day:02d}"

            quartier = random.choice(quartiers)
            tel_parent = f"+225 07{random.randint(10,99)}{random.randint(10,99)}{random.randint(10,99)}"
            nom_pere = f"M. {nom} {random.choice(prenoms_garcons)}"
            nom_mere = f"Mme {random.choice(noms_famille)} {random.choice(prenoms_filles)}"

            scolarite_due = 220000.0
            total_depot = random.choice([220000.0, 160000.0, 110000.0, 220000.0, 100000.0])
            solde_compte = scolarite_due - total_depot
            solde = total_depot - scolarite_due

            service_transport = 1 if i % 3 == 0 else 0
            service_cantine = 1 if i % 2 == 0 else 0
            moyenne = round(random.uniform(11.0, 18.5), 2)
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
                    'hinneh2026', 0,
                    1, 1, 1, 1,
                    1, 1, 1, 1,
                    1, 1, 1,
                    1, 1, 1, 1, 1,
                    ?, ?, 'inscription', 'Non Redoublant(e)', 'Affecté',
                    ?, datetime('now'), ?
                )
            """, (
                matricule, prenom, nom, dob, genre,
                ecole_id, cls_id, solde, moyenne, rang,
                code_etab, 'Abidjan', quartier, tel_parent,
                nom_pere, tel_parent, nom_mere, tel_parent,
                nom_pere, tel_parent,
                scolarite_due, total_depot, solde_compte,
                service_transport, service_cantine,
                total_depot, today_str
            ))

            eleve_id = c.lastrowid
            total_added += 1

            # Paiement
            if total_depot > 0:
                recu_num = f"RC-2026-{eleve_id:04d}"
                c.execute("""
                    INSERT INTO api_paiement
                    (montant, type, mode, statut, date, numero_recu, eleve_id, ecole_id, ET_CODEETABLISSEMENT, frais_annexe_valide, date_creation)
                    VALUES (?, 'scolarite', 'especes', 'paye', datetime('now'), ?, ?, ?, ?, 0, datetime('now'))
                """, (total_depot, recu_num, eleve_id, ecole_id, code_etab))

            # Echéancier
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

        # Update class effectif
        c.execute("SELECT COUNT(*) FROM api_eleve WHERE classe_id = ?", (cls_id,))
        new_cnt = c.fetchone()[0]
        c.execute("UPDATE api_classe SET CE_EFFECTIF = ? WHERE id = ?", (new_cnt, cls_id))

    # Also update student 1580 ("do dagnogo")
    c.execute("UPDATE api_eleve SET classe_id = 1, ecole_id = 1, ET_CODEETABLISSEMENT = 'FHA-01', statut = 'actif', date_inscription = ? WHERE id = 1580", (today_str,))

    # Fix all date_inscription across all eleves
    c.execute("UPDATE api_eleve SET date_inscription = substr(date_inscription, 1, 10) WHERE length(date_inscription) > 10")
    c.execute("UPDATE api_eleve SET date_naissance = substr(date_naissance, 1, 10) WHERE length(date_naissance) > 10")

    conn.commit()
    conn.close()
    print(f"=== Opération terminée : {total_added} élèves ajoutés avec succès ! ===")

if __name__ == '__main__':
    populate_students()
