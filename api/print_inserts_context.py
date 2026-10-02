def print_inserts_with_context(sql_path, tables):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        for t in tables:
            if f"INSERT INTO `{t}`" in line or f"INSERT INTO {t}" in line:
                print(f"=== INSERT STATEMENT FOR {t} (Line {i+1}) ===")
                # Print the matching line and the next 15 lines
                for j in range(i, min(i + 15, len(lines))):
                    print(f"{j+1}: {lines[j].strip()}")
                print("=========================================\n")

if __name__ == "__main__":
    tables = ["so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_personnel"]
    print_inserts_with_context("sq.sql", tables)
