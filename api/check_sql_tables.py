import re

def list_all_tables(sql_path):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    matches = re.findall(r"CREATE TABLE (?:IF NOT EXISTS )?`([^`]+)`", content, re.IGNORECASE)
    print("Tables found in sq.sql:")
    for m in sorted(matches):
        print(f" - {m}")

if __name__ == "__main__":
    list_all_tables("sq.sql")
