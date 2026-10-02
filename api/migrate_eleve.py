import sys
import os
import sqlite3

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import models
from app.database import engine

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "school_educ.db")
    if not os.path.exists(db_path):
        print("Database school_educ.db not found.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Get existing columns in api_eleve
    existing_cols = [col[1] for col in c.execute("PRAGMA table_info(api_eleve)").fetchall()]
    print(f"api_eleve currently has {len(existing_cols)} columns.")

    # Get model columns
    model_cols = models.Eleve.__table__.columns

    missing = []
    for col in model_cols:
        if col.name not in existing_cols:
            missing.append(col)

    print(f"Found {len(missing)} missing columns to add to api_eleve.")

    for col in missing:
        col_type = "TEXT"
        col_name = col.name
        if "BOOLEAN" in str(col.type).upper() or "INT" in str(col.type).upper():
            col_type = "INTEGER DEFAULT 0"
        elif "FLOAT" in str(col.type).upper() or "NUMERIC" in str(col.type).upper():
            col_type = "REAL DEFAULT 0.0"
        elif "DATETIME" in str(col.type).upper() or "DATE" in str(col.type).upper():
            col_type = "DATETIME"

        sql = f"ALTER TABLE api_eleve ADD COLUMN {col_name} {col_type}"
        print(f"Executing: {sql}")
        try:
            c.execute(sql)
        except Exception as e:
            print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("api_eleve migration complete!")

if __name__ == "__main__":
    migrate()
