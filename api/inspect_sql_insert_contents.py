def inspect_sql_insert_contents(sql_path, target_tables):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        for t in target_tables:
            if f"INSERT INTO `{t}`" in line or f"INSERT INTO {t}" in line:
                print(f"=== {t} INSERT (Line {i+1}) ===")
                # Print the line and the next 5 lines
                for j in range(i, min(i + 6, len(lines))):
                    print(f"{j+1}: {repr(lines[j])}")
                print()

if __name__ == "__main__":
    inspect_sql_insert_contents("sq.sql", ["api_cycle", "api_niveau", "api_classe", "api_personnel"])
