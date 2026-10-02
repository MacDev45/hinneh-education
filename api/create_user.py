import sys
import os
import argparse

# Add parent directory of backend/app to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models, crud

def main():
    parser = argparse.ArgumentParser(description="Créer un nouvel utilisateur dans HINNEH ÉDUCATION")
    parser.add_argument("--username", help="Nom d'utilisateur (email ou identifiant)")
    parser.add_argument("--password", help="Mot de passe")
    parser.add_argument("--email", help="Adresse email")
    parser.add_argument("--prenom", help="Prénom de l'utilisateur")
    parser.add_argument("--nom", help="Nom de l'utilisateur")
    parser.add_argument("--telephone", help="Numéro de téléphone")
    parser.add_argument("--fonction", choices=["admin", "direction", "enseignant", "coranique", "surveillance", "service"], help="Fonction / Rôle de l'utilisateur")
    parser.add_argument("--ecole-id", type=int, help="ID de l'établissement principal")
    parser.add_argument("--ecoles", nargs="+", type=int, help="Liste d'ID d'établissements autorisés (ex: --ecoles 1 2 3)")

    args = parser.parse_args()
    db = SessionLocal()

    try:
        # Check schools in DB
        schools = db.query(models.Etablissement).all()
        if not schools:
            print("Erreur : Aucun établissement scolaire trouvé dans la base de données. Veuillez d'abord insérer un établissement.")
            return

        # If no arguments provided, run interactively
        username = args.username
        if not username:
            print("--- Création interactive d'un utilisateur ---")
            while True:
                username = input("Nom d'utilisateur / Login (ex: direction@hinneh.ci) : ").strip()
                if not username:
                    print("Ce champ est obligatoire.")
                    continue
                # Verify if username exists
                if crud.get_user_by_username(db, username):
                    print("Erreur : Ce nom d'utilisateur est déjà pris.")
                    continue
                break

        password = args.password
        if not password:
            while True:
                password = input("Mot de passe : ").strip()
                if not password:
                    print("Le mot de passe ne peut pas être vide.")
                    continue
                break

        email = args.email
        if not email:
            while True:
                email = input("Email (ex: prenom.nom@hinneh.ci) : ").strip()
                if not email:
                    print("Ce champ est obligatoire.")
                    continue
                if crud.get_user_by_email(db, email):
                    print("Erreur : Cet email est déjà associé à un autre compte.")
                    continue
                break

        prenom = args.prenom
        if not prenom:
            prenom = input("Prénom : ").strip()

        nom = args.nom
        if not nom:
            nom = input("Nom : ").strip()

        telephone = args.telephone
        if not telephone:
            telephone = input("Téléphone (ex: +225 0102030405) : ").strip()

        fonction = args.fonction
        if not fonction:
            print("\nFonctions disponibles :")
            print("1. admin")
            print("2. direction")
            print("3. enseignant")
            print("4. coranique")
            print("5. surveillance")
            print("6. service")
            choices = ["admin", "direction", "enseignant", "coranique", "surveillance", "service"]
            while True:
                choice_idx = input("Choisissez une fonction (1-6) : ").strip()
                if choice_idx.isdigit() and 1 <= int(choice_idx) <= 6:
                    fonction = choices[int(choice_idx) - 1]
                    break
                print("Choix invalide.")

        ecoles_selected = args.ecoles or []
        ecole_id = args.ecole_id

        if not ecoles_selected and not ecole_id:
            print("\nÉtablissements disponibles par VILLE :")
            villes = sorted(list(set(sch.ET_VILLE or "Non spécifiée" for sch in schools)))
            for v in villes:
                print(f"  📍 Ville : {v}")
                schs_v = [s for s in schools if (s.ET_VILLE or "Non spécifiée") == v]
                for sch in schs_v:
                    print(f"     [ID {sch.IDETABLISSEMENT}] {sch.ET_DENOMMINATION} (Code: {sch.ET_CODEETABLISSEMENT or 'N/A'})")
            while True:
                ecole_input = input("Entrez les ID des établissements autorisés séparés par des virgules ou espaces (ex: 1, 2) : ").strip()
                raw_ids = [x.strip() for x in ecole_input.replace(",", " ").split() if x.strip().isdigit()]
                valid_ids = [int(x) for x in raw_ids if any(sch.IDETABLISSEMENT == int(x) for sch in schools)]
                if valid_ids:
                    ecoles_selected = valid_ids
                    ecole_id = valid_ids[0]
                    break
                print("Aucun ID valide saisi. Réessayez.")
        elif ecole_id and not ecoles_selected:
            ecoles_selected = [ecole_id]
        elif ecoles_selected and not ecole_id:
            ecole_id = ecoles_selected[0]

        # Let's perform validation checks if passed via CLI
        if args.username:
            if crud.get_user_by_username(db, username):
                print(f"Erreur : Le nom d'utilisateur '{username}' existe déjà.")
                return
            if crud.get_user_by_email(db, email):
                print(f"Erreur : L'email '{email}' est déjà associé à un compte.")
                return

        # Start creation
        hashed_pwd = crud.get_password_hash(password)
        db_user = models.CustomUser(
            username=username,
            email=email,
            password=hashed_pwd,
            first_name=prenom,
            last_name=nom,
            is_staff=True,
            is_active=True,
            ecoles_autorisees=ecoles_selected
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        db_staff = models.Personnel(
            prenom=prenom,
            nom=nom,
            email=email,
            telephone=telephone,
            fonction=fonction,
            statut="actif",
            charge_horaire=0,
            ecole_id=ecole_id,
            ecoles_autorisees=ecoles_selected,
            user_id=db_user.id
        )
        db.add(db_staff)
        db.commit()
        db.refresh(db_staff)

        school_names = [s.ET_DENOMMINATION for s in schools if s.IDETABLISSEMENT in ecoles_selected]
        print(f"\nSuccès ! L'utilisateur '{username}' a été créé avec succès.")
        print(f"Nom complet : {prenom} {nom}")
        print(f"Rôle/Fonction : {fonction}")
        print(f"Établissement principal : ID {ecole_id}")
        print(f"Établissements autorisés ({len(ecoles_selected)}) : {', '.join(school_names)}")
        print(f"ID Utilisateur : {db_user.id} | ID Personnel : {db_staff.id}")

    except Exception as e:
        db.rollback()
        print(f"\nUne erreur est survenue lors de la création de l'utilisateur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
