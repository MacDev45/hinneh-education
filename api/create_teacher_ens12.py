import sqlite3
from datetime import datetime
import hashlib
import secrets
import base64

def hash_password(password: str) -> str:
    iterations = 260000
    salt = secrets.token_hex(12)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    b64_hash = base64.b64encode(key).decode('ascii')
    return f"pbkdf2_sha256${iterations}${salt}${b64_hash}"

def create_teacher_account():
    conn = sqlite3.connect('api/school_educ.db')
    c = conn.cursor()

    username = "ens12"
    password_plain = "Code@123"
    email = "ens12@hinneh.ci"
    prenom = "Drissa"
    nom = "KOUAME"
    telephone = "+225 07 12 34 56 78"
    hashed_pwd = hash_password(password_plain)

    # 1. Clean up existing account with this username or email if any
    c.execute("SELECT id FROM user_educ WHERE username = ? OR email = ?", (username, email))
    existing_user = c.fetchone()
    if existing_user:
        user_id = existing_user[0]
        c.execute("DELETE FROM api_attributionmatiere WHERE enseignant_id IN (SELECT id FROM api_personnel WHERE user_id = ?)", (user_id,))
        c.execute("DELETE FROM api_personnel WHERE user_id = ?", (user_id,))
        c.execute("DELETE FROM user_educ WHERE id = ?", (user_id,))
        conn.commit()

    c.execute("SELECT id FROM api_personnel WHERE email = ?", (email,))
    existing_staff = c.fetchone()
    if existing_staff:
        staff_id = existing_staff[0]
        c.execute("DELETE FROM api_attributionmatiere WHERE enseignant_id = ?", (staff_id,))
        c.execute("DELETE FROM api_personnel WHERE id = ?", (staff_id,))
        conn.commit()

    # 2. Insert into user_educ
    c.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM user_educ")
    next_user_id = c.fetchone()[0]

    c.execute("""
        INSERT INTO user_educ 
        (
            id, password, last_login, is_superuser, username, first_name, last_name, 
            is_staff, is_active, date_joined, email, ET_CODEETABLISSEMENT, PROFIL, ville
        )
        VALUES (?, ?, NULL, 0, ?, ?, ?, 1, 1, datetime('now'), ?, 'FHA-01', 'enseignant', 'Abidjan')
    """, (next_user_id, hashed_pwd, username, prenom, nom, email))
    conn.commit()

    # 3. Insert into api_personnel
    c.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM api_personnel")
    next_staff_id = c.fetchone()[0]

    c.execute("""
        INSERT INTO api_personnel
        (
            id, prenom, nom, email, telephone, fonction, statut, charge_horaire,
            num_autorisation_enseigner, is_cnps_declare, score_evaluation, date_creation,
            ecole_id, user_id, ET_CODEETABLISSEMENT
        )
        VALUES (?, ?, ?, ?, ?, 'enseignant', 'actif', 18, 'AUT-ENS-2026-012', 1, 94.5, datetime('now'), 1, ?, 'FHA-01')
    """, (next_staff_id, prenom, nom, email, telephone, next_user_id))
    conn.commit()

    # 4. Assurer les salles dans api_salle
    salles = [
        ('SALLE_101', 'Salle 101', 35, 1, 'FHA-01'),
        ('SALLE_102', 'Salle 102', 35, 1, 'FHA-01'),
        ('SALLE_103', 'Salle 103', 35, 1, 'FHA-01'),
        ('SALLE_201', 'Salle 201', 35, 1, 'FHA-01'),
        ('SALLE_202', 'Salle 202', 35, 1, 'FHA-01'),
    ]
    for code_s, lib_s, cap, ecole_id, code_etab in salles:
        c.execute("SELECT id FROM api_salle WHERE code = ?", (code_s,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO api_salle (code, libelle, type_salle, capacite, disponible, ecole_id, ET_CODEETABLISSEMENT, date_creation)
                VALUES (?, ?, 'classe', ?, 1, ?, ?, datetime('now'))
            """, (code_s, lib_s, cap, ecole_id, code_etab))
    conn.commit()

    # 5. Attribuer la classe 1 (6ème A) en tant que Professeur Principal
    c.execute("UPDATE api_classe SET enseignant_id = ? WHERE id = 1", (next_staff_id,))

    # 6. Emploi du temps réel (Attributions de cours)
    # Formats: (classe_id, matiere_id, jour, heure, salle, groupe)
    # Matière 1 = Mathématiques, 5 = Éducation Islamique
    cours_schedule = [
        # Lundi (6h)
        (1, 1, 'Lundi', '08:00 - 10:00', 'Salle 101', 'Classe entière'), # 6ème A - Maths
        (9, 1, 'Lundi', '10:30 - 12:30', 'Salle 102', 'Classe entière'), # 5ème 1 - Maths
        (2, 1, 'Lundi', '14:00 - 16:00', 'Salle 201', 'Classe entière'), # 3ème B - Maths

        # Mardi (4h)
        (11, 1, 'Mardi', '08:00 - 10:00', 'Salle 202', 'Classe entière'), # 4ème 1 - Maths
        (7, 1, 'Mardi', '10:30 - 12:30', 'Salle 103', 'Classe entière'),  # 6ème 1 - Maths

        # Mercredi (4h)
        (2, 1, 'Mercredi', '08:00 - 10:00', 'Salle 201', 'Classe entière'), # 3ème B - Maths
        (9, 1, 'Mercredi', '10:30 - 12:30', 'Salle 102', 'Classe entière'), # 5ème 1 - Maths

        # Jeudi (5h30)
        (1, 1, 'Jeudi', '08:00 - 10:00', 'Salle 101', 'Classe entière'),  # 6ème A - Maths
        (11, 1, 'Jeudi', '10:30 - 12:30', 'Salle 202', 'Classe entière'), # 4ème 1 - Maths
        (7, 5, 'Jeudi', '14:00 - 15:30', 'Salle 103', 'Classe entière'),  # 6ème 1 - Éduc. Islamique

        # Vendredi (3h30)
        (1, 5, 'Vendredi', '08:00 - 10:00', 'Salle 101', 'Classe entière'), # 6ème A - Éduc. Islamique
        (2, 5, 'Vendredi', '10:30 - 12:00', 'Salle 201', 'Classe entière'), # 3ème B - Éduc. Islamique
    ]

    for cid, mid, jour, heure, salle, groupe in cours_schedule:
        c.execute("""
            INSERT INTO api_attributionmatiere
            (statut, jour, heure, salle, classe_id, enseignant_id, matiere_id, groupe, ET_CODEETABLISSEMENT, ecole_id)
            VALUES ('actif', ?, ?, ?, ?, ?, ?, ?, 'FHA-01', 1)
        """, (jour, heure, salle, cid, next_staff_id, mid, groupe))

    conn.commit()
    conn.close()

    print(f"=== SUCCÈS : Compte enseignant créé ===")
    print(f"Login : {username}")
    print(f"Mot de passe : {password_plain}")
    print(f"Nom : {prenom} {nom}")
    print(f"Staff ID : {next_staff_id}, User ID : {next_user_id}")
    print(f"Nombre de créneaux d'emploi du temps créés : {len(cours_schedule)}")

if __name__ == '__main__':
    create_teacher_account()
