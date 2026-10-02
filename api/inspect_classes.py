import os
from sqlalchemy import create_engine, text

def inspect_data():
    # SQLite
    sqlite_path = "api/school_educ.db"
    print("=== SQLite Data ===")
    if os.path.exists(sqlite_path):
        sqlite_engine = create_engine(f"sqlite:///{sqlite_path}")
        with sqlite_engine.connect() as conn:
            # Cycles
            res = conn.execute(text("SELECT * FROM api_cycle")).fetchall()
            print(f"Cycles ({len(res)}):", res)
            # Levels
            res = conn.execute(text("SELECT * FROM api_niveau")).fetchall()
            print(f"Levels ({len(res)}):", res[:3])
            # Classes
            res = conn.execute(text("SELECT * FROM api_classe")).fetchall()
            print(f"Classes ({len(res)}):", res)
            # Personnel
            res = conn.execute(text("SELECT * FROM api_personnel")).fetchall()
            print(f"Personnel ({len(res)}):", res[:2])
            # Schools
            res = conn.execute(text("SELECT * FROM so_etablissement")).fetchall()
            print(f"Schools ({len(res)}):", res)
    else:
        print("SQLite db not found")

    # MySQL
    print("\n=== MySQL Data ===")
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/hinneh_unifie"
    try:
        mysql_engine = create_engine(db_url)
        with mysql_engine.connect() as conn:
            # Cycles
            res = conn.execute(text("SELECT * FROM api_cycle")).fetchall()
            print(f"Cycles ({len(res)}):", res)
            # Levels
            res = conn.execute(text("SELECT * FROM api_niveau")).fetchall()
            print(f"Levels ({len(res)}):", res[:3])
            # Classes
            res = conn.execute(text("SELECT * FROM api_classe")).fetchall()
            print(f"Classes ({len(res)}):", res)
            # Personnel
            res = conn.execute(text("SELECT * FROM api_personnel")).fetchall()
            print(f"Personnel ({len(res)}):", res[:2])
            # Schools
            res = conn.execute(text("SELECT * FROM so_etablissement")).fetchall()
            print(f"Schools ({len(res)}):", res)
    except Exception as e:
        print(f"MySQL connection failed: {e}")

if __name__ == "__main__":
    inspect_data()
