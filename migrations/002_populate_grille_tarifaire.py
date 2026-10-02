#!/usr/bin/env python3
"""
Migration: Peupler api_grille_tarifaire avec les données réelles d'hinneh_presets.json
Exécution: python migrations/002_populate_grille_tarifaire.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Chemin du fichier JSON source
JSON_FILE = Path(__file__).parent.parent / "api" / "app" / "data" / "hinneh_presets.json"

def load_presets():
    """Charge les presets depuis le fichier JSON."""
    if not JSON_FILE.exists():
        print(f"ERREUR: Fichier {JSON_FILE} introuvable")
        return {}

    with open(JSON_FILE, encoding='utf-8') as f:
        return json.load(f)

def escape_sql_string(value):
    """Échappe une chaîne pour SQL."""
    if value is None:
        return "NULL"
    value_str = str(value).replace("'", "''")
    return f"'{value_str}'"

def escape_json(obj):
    """Échappe un objet JSON pour SQL."""
    return escape_sql_string(json.dumps(obj, ensure_ascii=False))

def generate_sql():
    """Génère les INSERT statements SQL."""
    presets = load_presets()

    if not presets:
        print("ERREUR: Aucun preset trouvé")
        return ""

    sql_lines = [
        "-- Migration: Peupler api_grille_tarifaire avec les données réelles d'hinneh_presets.json",
        f"-- Generated: {datetime.now().isoformat()}",
        "",
        "-- Nettoyer les anciennes données si présentes",
        "DELETE FROM api_grille_tarifaire WHERE type_service = 'scolarite';",
        "",
        "-- Insérer les presets de scolarité (type_service='scolarite')",
    ]

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for preset_id, preset in presets.items():
        cycle = preset.get("cycle", "").strip()
        niveaux = json.dumps(preset.get("niveaux", []), ensure_ascii=False)
        label = preset.get("label", preset_id).replace("'", "''")
        statut = preset.get("statut_affectation", "TOUS").upper()
        total = float(preset.get("total", 0))
        tranches = json.dumps(preset.get("tranches", []), ensure_ascii=False)

        insert = (
            f"INSERT INTO api_grille_tarifaire "
            f"(preset_id, label, type_service, cycle, niveaux, statut_affectation, total, tranches, "
            f"annee_scolaire, is_active, date_creation, date_modification) "
            f"VALUES ("
            f"{escape_sql_string(preset_id)}, "
            f"{escape_sql_string(label)}, "
            f"'scolarite', "
            f"{escape_sql_string(cycle)}, "
            f"{escape_json(preset.get('niveaux', []))}, "
            f"{escape_sql_string(statut)}, "
            f"{total}, "
            f"{escape_json(preset.get('tranches', []))}, "
            f"'2026-2027', "
            f"1, "
            f"'{now}', "
            f"'{now}'"
            f");"
        )
        sql_lines.append(insert)

    sql_lines.append("")
    sql_lines.append("-- Migration complétée")

    return "\n".join(sql_lines)

if __name__ == "__main__":
    sql = generate_sql()

    # Écrire dans un fichier SQL
    sql_file = Path(__file__).parent / "002_populate_grille_tarifaire.sql"
    with open(sql_file, "w", encoding='utf-8') as f:
        f.write(sql)

    print(f"✓ Migration générée: {sql_file}")
    print(f"  Exécutez: mysql -u user -p database < {sql_file}")
