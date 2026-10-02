# -*- coding: utf-8 -*-
"""
Remplace toutes les occurrences de "Lycée" par "Collège 2nd cycle"
dans les fichiers frontend (.tsx, .ts) et backend (.py)
"""
import os
import sys

# Répertoire racine du projet
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
API = os.path.join(ROOT, "api", "app")

# Mappings de remplacement (ordre important : plus spécifique d'abord)
REPLACEMENTS_LABEL = [
    # Labels affichés (avec accents)
    ("Lycée (Affectés)",              "Collège 2nd cycle (Affectés)"),
    ("Lycée (Non-Affectés)",          "Collège 2nd cycle (Non-Affectés)"),
    ("Lycée 2nd Cycle",               "Collège 2nd cycle"),
    ("2nd Cycle Lycée",               "Collège 2nd cycle"),
    ("Tout Lycée (2nde, 1ère, Tle)",  "Tout 2nd cycle (2nde, 1ère, Tle)"),
    ("Lyc\u00e9e 2nd cycle",               "Coll\u00e8ge 2nd cycle"),
    # Label générique
    ("Lycée",  "Collège 2nd cycle"),
    ("Lyc\u00e9e", "Coll\u00e8ge 2nd cycle"),
]

# Extensions à traiter
EXTENSIONS = (".tsx", ".ts", ".py")
# Fichiers à exclure
SKIP_FILES = {"vite.config.ts", "tailwind.config.ts"}

def process_dir(directory):
    changed = []
    for dirpath, _, filenames in os.walk(directory):
        # Ignorer node_modules et __pycache__
        if "node_modules" in dirpath or "__pycache__" in dirpath:
            continue
        for fname in filenames:
            if not any(fname.endswith(ext) for ext in EXTENSIONS):
                continue
            if fname in SKIP_FILES:
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue
            
            original = content
            for old, new in REPLACEMENTS_LABEL:
                content = content.replace(old, new)
            
            if content != original:
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)
                rel = os.path.relpath(fpath, ROOT)
                changed.append(rel)
                print(f"  [OK] {rel}")
    return changed

print("\n=== Remplacement Lycée -> Collège 2nd cycle ===\n")

changed_src = process_dir(SRC)
changed_api = process_dir(API)

all_changed = changed_src + changed_api
print(f"\nTotal: {len(all_changed)} fichier(s) modifié(s)")

# Aussi corriger les fichiers backend spécifiques
BACKEND_FILES = [
    os.path.join(ROOT, "api", "app", "main.py"),
    os.path.join(ROOT, "api", "app", "crud.py"),
    os.path.join(ROOT, "api", "app", "models.py"),
]
for fpath in BACKEND_FILES:
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS_LABEL:
        content = content.replace(old, new)
    if content != original:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        rel = os.path.relpath(fpath, ROOT)
        print(f"  [OK] {rel}")
