import sqlite3
import os

db_path = os.path.join("api", "school_educ.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("UPDATE api_personnel SET fonction = 'scolarite' WHERE email LIKE '%test24%' OR user_id IN (SELECT id FROM user_educ WHERE username LIKE '%test24%')")
c.execute("UPDATE user_educ SET PROFIL = 'scolarite' WHERE username LIKE '%test24%' OR email LIKE '%test24%'")
conn.commit()

print("User test24 updated in DB successfully!")
conn.close()
