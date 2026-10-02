import os
from sqlalchemy import create_engine, text

def inspect_users():
    # Inspect SQLite
    sqlite_path = "api/school_educ.db"
    if os.path.exists(sqlite_path):
        print("SQLite Users:")
        try:
            engine = create_engine(f"sqlite:///{sqlite_path}")
            with engine.connect() as conn:
                res = conn.execute(text("SELECT id, username, email FROM api_customuser")).fetchall()
                for row in res:
                    print(f" - ID: {row[0]}, Username: {row[1]}, Email: {row[2]}")
        except Exception as e:
            print(f"Error inspecting SQLite users: {e}")
            
    # Inspect Configured MySQL
    print("\nMySQL Users:")
    env_path = ".env"
    db_url = None
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1].strip('"').strip("'")
                    break
    if db_url:
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                res = conn.execute(text("SELECT id, username, email FROM api_customuser")).fetchall()
                for row in res:
                    print(f" - ID: {row[0]}, Username: {row[1]}, Email: {row[2]}")
        except Exception as e:
            print(f"Error inspecting MySQL users: {e}")

if __name__ == "__main__":
    inspect_users()
