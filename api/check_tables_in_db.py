import sqlite3
import os

db_path = "school_educ.db"
print(f"Checking SQLite database at: {os.path.abspath(db_path)}")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print("Tables found:")
    for t in sorted(tables):
        print(f" - {t}")
else:
    print("Database file does not exist!")
