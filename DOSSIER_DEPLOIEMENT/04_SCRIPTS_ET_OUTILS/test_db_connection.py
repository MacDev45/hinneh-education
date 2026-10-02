#!/usr/bin/env python3
import pymysql
print("Test de connexion MySQL 10.10.10.100:3306 (BD: insights_central)...")
try:
    conn = pymysql.connect(host="10.10.10.100", user="insights_dbuser", password="Code@96*macsys", database="insights_central", port=3306, connect_timeout=10)
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM user_educ;")
        print(f"[OK] Connexion reussie ! Utilisateurs : {cur.fetchone()[0]}")
    conn.close()
except Exception as e:
    print(f"[ERR] {e}")
