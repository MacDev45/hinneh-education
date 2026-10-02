import re

def print_inserts(sql_path, tables):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            for t in tables:
                if f"INSERT INTO `{t}`" in line or f"INSERT INTO {t}" in line:
                    print(f"--- INSERT FOR {t} ---")
                    print(line[:1000] + ("..." if len(line) > 1000 else ""))
                    print()

if __name__ == "__main__":
    tables = ["so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_personnel"]
    print_inserts("sq.sql", tables)
