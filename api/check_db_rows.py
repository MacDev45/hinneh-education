import os
import sys
from sqlalchemy import create_engine, text

def check_db():
    # Try local SQLite first
    sqlite_path = "api/school_educ.db"
    print(f"Checking SQLite database at: {sqlite_path}")
    if os.path.exists(sqlite_path):
        try:
            sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
            with sqlite_engine.connect() as conn:
                for table in ["so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_personnel"]:
                    try:
                        res = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                        print(f"SQLite Table {table}: {res[0]} rows")
                    except Exception as e:
                        print(f"SQLite Table {table} Error: {e}")
        except Exception as e:
            print(f"Failed to connect to SQLite: {e}")
    else:
        print("SQLite database file not found.")

    # Try configured DATABASE_URL
    print("\nChecking configured DATABASE_URL...")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # try reading from .env
        env_path = ".env"
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("DATABASE_URL="):
                        db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
                        break
        if not db_url and os.path.exists("api/.env.development"):
            with open("api/.env.development", "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("DATABASE_URL="):
                        db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
                        break
                        
    if db_url:
        print(f"DATABASE_URL found: {db_url}")
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                for table in ["so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_personnel"]:
                    try:
                        res = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                        print(f"Configured Table {table}: {res[0]} rows")
                    except Exception as e:
                        print(f"Configured Table {table} Error: {e}")
        except Exception as e:
            print(f"Failed to connect to configured DATABASE_URL: {e}")
    else:
        print("No DATABASE_URL configured or found.")

if __name__ == "__main__":
    check_db()
