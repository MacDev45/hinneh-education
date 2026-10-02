#!/usr/bin/env python3
"""Ajouter useMemo à tous les imports React qui en ont besoin."""

import re
from pathlib import Path

pages_dir = Path("src/pages")
fixed = 0

for tsx_file in pages_dir.glob("*.tsx"):
    content = tsx_file.read_text()

    # Si le fichier utilise useMemo mais ne l'importe pas
    if "useMemo(" in content and "useMemo" not in content.split('\n')[0:10]:
        # Ajouter useMemo à l'import React
        pattern = r'import\s*{\s*([^}]+)\s*}\s*from\s*[\'"]react[\'"]'

        def add_usememo(match):
            imports = match.group(1)
            if "useMemo" not in imports:
                # Ajouter useMemo à la fin de la liste
                return f"import {{ {imports}, useMemo }} from 'react'"
            return match.group(0)

        new_content = re.sub(pattern, add_usememo, content)

        if new_content != content:
            tsx_file.write_text(new_content)
            print(f"✅ Fixed: {tsx_file.name}")
            fixed += 1

print(f"\n✅ Total files fixed: {fixed}")
