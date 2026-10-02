import re

def extract_tables(sql_path, target_tables):
    with open(sql_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple regex to extract CREATE TABLE statements
    matches = re.finditer(r"CREATE TABLE IF NOT EXISTS `([^`]+)` \((.*?)\) ENGINE=", content, re.DOTALL | re.IGNORECASE)
    
    found_tables = {}
    for match in matches:
        table_name = match.group(1)
        table_body = match.group(2)
        if table_name in target_tables:
            found_tables[table_name] = f"CREATE TABLE `{table_name}` (\n{table_body.strip()}\n);"

    for target in target_tables:
        if target in found_tables:
            print(f"--- SCHEMA FOR {target} ---")
            print(found_tables[target])
            print("\n" + "="*50 + "\n")
        else:
            print(f"--- SCHEMA FOR {target} NOT FOUND ---")

if __name__ == "__main__":
    targets = [
        "so_etablissement", "api_cycle", "api_niveau", "api_classe", "api_eleve", 
        "api_personnel", "api_matiere", "api_attributionmatiere", "api_evaluation", 
        "api_presence", "api_paiement", "api_demandetraitement", "user_educ"
    ]
    extract_tables("sq.sql", targets)
