def inspect_table_schema(sql_path, table_name):
    with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    import re
    match = re.search(rf"CREATE TABLE (?:IF NOT EXISTS )?`{table_name}` \((.*?)\) ENGINE=", content, re.DOTALL | re.IGNORECASE)
    if match:
        print(f"Schema for `{table_name}` in sq.sql:")
        print(match.group(0))
    else:
        print(f"Table `{table_name}` not found in sq.sql")

if __name__ == "__main__":
    inspect_table_schema("sq.sql", "api_classe")
