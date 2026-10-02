import os
import sys
import sqlite3
from datetime import datetime

# Add api directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import crud

def create_user():
    email = "sita23@gmail.com"
    username = "sita23@gmail.com"
    plain_password = "Code@123"
    hashed_pwd = crud.get_password_hash(plain_password)
    first_name = "Sita"
    last_name = "Traoré"
    is_superuser = 1
    is_staff = 1
    is_active = 1
    date_joined = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"Creating user {email}...")

    # 1. Update SQLite DB: api/school_educ.db
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "school_educ.db")
    if os.path.exists(sqlite_path):
        conn = sqlite3.connect(sqlite_path)
        c = conn.cursor()

        # Update or Insert in api_customuser
        c.execute("SELECT id FROM api_customuser WHERE email = ? OR username = ?", (email, username))
        row = c.fetchone()
        if row:
            c.execute("""
                UPDATE api_customuser 
                SET password = ?, is_superuser = 1, is_staff = 1, is_active = 1, first_name = ?, last_name = ?
                WHERE id = ?
            """, (hashed_pwd, first_name, last_name, row[0]))
            user_id = row[0]
            print(f" -> Updated existing user #{user_id} in api_customuser.")
        else:
            c.execute("SELECT MAX(id) FROM api_customuser")
            max_id = c.fetchone()[0] or 0
            user_id = max_id + 1
            c.execute("""
                INSERT INTO api_customuser (id, password, last_login, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email)
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, hashed_pwd, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email))
            print(f" -> Created new user #{user_id} in api_customuser.")

        # Update or Insert in user_educ
        c.execute("SELECT id FROM user_educ WHERE email = ? OR username = ?", (email, username))
        row_educ = c.fetchone()
        if row_educ:
            c.execute("""
                UPDATE user_educ 
                SET password = ?, is_superuser = 1, is_staff = 1, is_active = 1, first_name = ?, last_name = ?, PROFIL = 'admin'
                WHERE id = ?
            """, (hashed_pwd, first_name, last_name, row_educ[0]))
            print(f" -> Updated existing user #{row_educ[0]} in user_educ.")
        else:
            c.execute("SELECT MAX(id) FROM user_educ")
            max_educ_id = c.fetchone()[0] or 0
            next_educ_id = max_educ_id + 1
            c.execute("""
                INSERT INTO user_educ (id, password, last_login, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email, ET_CODEETABLISSEMENT, PROFIL, ajoutele, modifierle, idUser)
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'ET001', 'admin', ?, ?, ?)
            """, (next_educ_id, hashed_pwd, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email, date_joined, date_joined, next_educ_id))
            print(f" -> Created new user #{next_educ_id} in user_educ.")

        conn.commit()
        conn.close()

    # 2. Try SQLAlchemy database session if available
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        existing = db.query(models.CustomUser).filter(
            (models.CustomUser.email == email) | (models.CustomUser.username == username)
        ).first()
        if existing:
            existing.password = hashed_pwd
            existing.is_superuser = True
            existing.is_staff = True
            existing.is_active = True
            print(" -> User updated via SQLAlchemy Session.")
        else:
            db_user = models.CustomUser(
                id=user_id,
                username=username,
                email=email,
                password=hashed_pwd,
                first_name=first_name,
                last_name=last_name,
                is_superuser=True,
                is_staff=True,
                is_active=True
            )
            db.add(db_user)
            print(f" -> User created via SQLAlchemy Session with ID {user_id}.")
        db.commit()
        db.close()
    except Exception as e:
        print(f" (Info: SQLAlchemy DB update skipped/failed: {e})")

    print("\nUser creation successful!")
    print(f"Email/Login: {email}")
    print(f"Password: {plain_password}")
    print("Role: Admin / Superuser")

if __name__ == "__main__":
    create_user()
