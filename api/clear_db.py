import sys
import os
from sqlalchemy import text

# Add parent directory of backend/app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models

def clear_mock_data():
    print("========================================")
    print(" PURGING MOCK DATA FROM DATABASE")
    print("========================================")
    
    db = SessionLocal()
    
    # 1. Disable Foreign Key Checks
    print("Disabling foreign key constraints...")
    is_mysql = "mysql" in str(engine.url)
    try:
        if is_mysql:
            db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        else:
            db.execute(text("PRAGMA foreign_keys = OFF;"))
        db.commit()
    except Exception as e:
        print(f"Warning: Could not disable constraints: {e}")

    try:
        # 2. Delete Transaction/Operation tables
        print("Clearing transactional tables...")
        deleted_payments = db.query(models.Paiement).delete()
        deleted_evals = db.query(models.Evaluation).delete()
        deleted_attendance = db.query(models.Presence).delete()
        deleted_requests = db.query(models.DemandeTraitement).delete()
        deleted_bulletins = db.query(models.Bulletin).delete()
        print(f" -> Cleared {deleted_payments} Payments, {deleted_evals} Evaluations, {deleted_attendance} Attendances, {deleted_requests} Requests, {deleted_bulletins} Bulletins.")
        db.commit()

        # 3. Delete entity tables
        print("Clearing entity tables...")
        deleted_students = db.query(models.Eleve).delete()
        deleted_attributions = db.query(models.AttributionMatiere).delete()
        deleted_classes = db.query(models.Classe).delete()
        deleted_staff = db.query(models.Personnel).delete()
        deleted_schools = db.query(models.Etablissement).delete()
        print(f" -> Cleared {deleted_students} Students, {deleted_attributions} Attributions, {deleted_classes} Classes, {deleted_staff} Staff, {deleted_schools} Schools.")
        db.commit()

        # 4. Clean CustomUsers (Keep only superusers)
        print("Cleaning non-superuser accounts...")
        # Get all users
        all_users = db.query(models.CustomUser).all()
        deleted_users_count = 0
        for user in all_users:
            # Keep if superuser or system default email
            if user.is_superuser or user.username in ["admin@hinneh.ci", "direction@hinneh.ci", "tout@hinneh.ci"]:
                continue
            db.delete(user)
            deleted_users_count += 1
        db.commit()
        print(f" -> Deleted {deleted_users_count} non-admin user accounts.")

        print("========================================")
        print("SUCCESS: Mock data successfully purged!")
        print("========================================")

    except Exception as e:
        db.rollback()
        print(f"Error during purge process: {e}")
    finally:
        # 5. Enable Foreign Key Checks
        print("Re-enabling foreign key constraints...")
        try:
            if is_mysql:
                db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            else:
                db.execute(text("PRAGMA foreign_keys = ON;"))
            db.commit()
        except Exception as e:
            print(f"Warning: Could not re-enable constraints: {e}")
        
        db.close()

if __name__ == "__main__":
    clear_mock_data()
