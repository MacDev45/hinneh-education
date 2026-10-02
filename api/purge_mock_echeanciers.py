#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de purge des échéanciers mock / vierges sans paiement.
Supprime toutes les lignes dans `api_echeancier_paiement` ayant montant_paye = 0 ou NULL,
en préservant strictement toutes les échéances ayant des paiements réels.

Usage:
    python purge_mock_echeanciers.py
"""

import sys
import os

# Ajouter le dossier api au sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from app.database import engine, get_engine
from sqlalchemy import text

def purge_unpaid():
    eng = get_engine()
    print(f"\n[Info] Connexion à la base de données : {eng.url.database} sur {eng.url.host}...")
    with eng.connect() as conn:
        # 1. Compter le nombre d'échéances sans paiement
        res_count = conn.execute(text("""
            SELECT COUNT(*) FROM api_echeancier_paiement 
            WHERE montant_paye IS NULL OR montant_paye <= 0.00
        """)).scalar()
        
        # 2. Compter le nombre d'échéances conservées (avec paiements)
        res_kept = conn.execute(text("""
            SELECT COUNT(*) FROM api_echeancier_paiement 
            WHERE montant_paye > 0.00
        """)).scalar()

        print(f"[Info] Échéances vierges / mock détectées : {res_count}")
        print(f"[Info] Échéances avec paiements réels (conservées) : {res_kept}")

        if res_count == 0:
            print("[OK] Aucune échéance mock à supprimer. La base est déjà propre !")
            return

        # 3. Supprimer les échéances vierges
        conn.execute(text("""
            DELETE FROM api_echeancier_paiement 
            WHERE montant_paye IS NULL OR montant_paye <= 0.00
        """))
        conn.commit()
        print(f"[SUCCÈS] {res_count} échéance(s) vierge(s) / mock supprimée(s) avec succès !")

if __name__ == "__main__":
    purge_unpaid()
