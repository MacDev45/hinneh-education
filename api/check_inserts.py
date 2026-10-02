import re

def check_inserts(sql_path, tables):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    for t in tables:
        # Match INSERT INTO `table`
        matches = re.findall(rf"INSERT INTO\s+`{t}`", content, re.IGNORECASE)
        print(f"Table `{t}` has {len(matches)} INSERT statements in sq.sql")

if __name__ == "__main__":
    tables = ["so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_personnel", "api_customuser"]
    check_inserts("sq.sql", tables)
