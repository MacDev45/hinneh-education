#!/usr/bin/env python3
"""Script pour créer l'admin SQLite local et vérifier la base."""
import sqlite3
import hashlib
import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "school_local.db")

def run():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Vérifier si admin existe
    c.execute("SELECT id, username, PROFIL FROM user_educ WHERE username = 'admin'")
    row = c.fetchone()
    if row:
        print(f"Admin déjà existant: id={row['id']}, profil={row['PROFIL']}")
    else:
        c.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM user_educ")
        new_id = c.fetchone()[0]
        pwd = "admin2026"
        pwd_hash = "sha256$" + hashlib.sha256(pwd.encode()).hexdigest()
        now = datetime.datetime.utcnow().isoformat()
        c.execute(
            """INSERT INTO user_educ
               (id, password, is_superuser, username, first_name, last_name,
                is_staff, is_active, date_joined, email, PROFIL, must_change_password)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (new_id, pwd_hash, 1, "admin", "Admin", "Hinneh",
             1, 1, now, "admin@hinneh-education.ci", "superadmin", 0)
        )
        conn.commit()
        print(f"Admin créé: id={new_id}, username=admin, password=admin2026")

    # Stats
    c.execute("SELECT COUNT(*) as n FROM user_educ")
    print(f"Utilisateurs: {c.fetchone()['n']}")
    c.execute("SELECT COUNT(*) as n FROM so_etablissement")
    try:
        print(f"Écoles: {c.fetchone()['n']}")
    except Exception:
        print("Table so_etablissement vide")
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in c.fetchall()]
    print(f"Tables dans la DB: {len(tables)}")
    conn.close()
    print("\nBase SQLite prête.")

if __name__ == "__main__":
    run()
