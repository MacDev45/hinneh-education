import os
import pymysql

def reset_passwords():
    # 1. Update MySQL
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/hinneh_unifie"
    print("Connecting to MySQL...")
    try:
        connection = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='hinneh_unifie',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            # Set password to plain-text 'dev2026' which triggers fallback comparison
            sql = "UPDATE api_customuser SET password = 'dev2026'"
            cursor.execute(sql)
            print(f"MySQL customuser passwords reset. Rows affected: {cursor.rowcount}")
            
            # Reset student parent_passwords too
            sql_stud = "UPDATE api_eleve SET parent_password = 'dev2026'"
            cursor.execute(sql_stud)
            print(f"MySQL student parent_passwords reset. Rows affected: {cursor.rowcount}")
            
        connection.commit()
        connection.close()
    except Exception as e:
        print(f"Error resetting MySQL passwords: {e}")

    # 2. Update SQLite
    import sqlite3
    sqlite_path = "api/school_educ.db"
    if os.path.exists(sqlite_path):
        print("Connecting to SQLite...")
        try:
            conn = sqlite3.connect(sqlite_path)
            cursor = conn.cursor()
            cursor.execute("UPDATE api_customuser SET password = 'dev2026'")
            print(f"SQLite customuser passwords reset. Rows affected: {cursor.rowcount}")
            
            cursor.execute("UPDATE api_eleve SET parent_password = 'dev2026'")
            print(f"SQLite student parent_passwords reset. Rows affected: {cursor.rowcount}")
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error resetting SQLite passwords: {e}")

if __name__ == "__main__":
    reset_passwords()
