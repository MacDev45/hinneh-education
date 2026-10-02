import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Test salles import
csv_salles = """nom,capacite,type,batiment,etage,equipements
Salle 101,35,classe,Batiment A,RDC,Tableau projecteur
Salle 205,30,classe,Batiment B,1er,Tableau
"""

print("=== Test import salles ===")
r = client.post('/api/salles/import', files={'file': ('salles_test.csv', csv_salles, 'text/csv')})
print(r.status_code, r.json())

# Test classes import
csv_classes = """nom,niveau,cycle,capacite,professeur_principal,salle,annee_scolaire
CM2 A,CM2,primaire,35,,Salle 101,2025-2026
6eme B,6eme,college,30,,Salle 205,2025-2026
"""

print("\n=== Test import classes ===")
r = client.post('/api/classes/import', files={'file': ('classes_test.csv', csv_classes, 'text/csv')})
print(r.status_code, r.json())

# Test students import
csv_students = """nom,prenom,date_naissance,sexe,classe,statut,telephone_parent,email_parent,adresse,nom_parent
KOUASSI,Marie,15/03/2012,F,CM2 A,complete,0712345678,aya@email.com,Cocody,KOUASSI Aya
YAO,Paul,22/07/2011,M,6eme B,complete,0798765432,koffi@email.com,Bingerville,YAO Koffi
"""

print("\n=== Test import eleves ===")
r = client.post('/api/students/import', files={'file': ('eleves_test.csv', csv_students, 'text/csv')})
print(r.status_code, r.json())

# Test staff import
csv_staff = """nom,prenom,poste,role,telephone,email,date_embauche,salaire_base
KONE,Amadou,Enseignant Mathematiques,enseignant,0711223344,amadou@ecole.ci,01/09/2023,250000
BAKAYOKO,Fatou,Secretaire,administratif,0755667788,fatou@ecole.ci,15/01/2022,200000
"""

print("\n=== Test import personnel ===")
r = client.post('/api/staff/import', files={'file': ('personnel_test.csv', csv_staff, 'text/csv')})
print(r.status_code, r.json())

print("\nTests termines.")
