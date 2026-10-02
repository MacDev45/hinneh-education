import requests
from datetime import date, datetime

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("Starting API verification tests...")
    
    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    print("Health check response:", res.json())
    assert res.status_code == 200, "Health check failed"
    
    # 2. Create school (Etablissement)
    ts = int(datetime.now().timestamp())
    school_payload = {
        "ET_DENOMMINATION": "Fondation Hinneh Abidjan",
        "ET_CODEETABLISSEMENT": f"FHA-TEST-{ts}",
        "ET_REGION": "Lagunes",
        "ET_VILLE": "Abidjan",
        "ET_ADRESSE_POSTALE": "BP 123 Abidjan",
        "ET_CONTACTS": "+225 0102030405",
        "ET_EMAIL": "contact@hinneh.ci",
        "ET_CYCLES": ["college", "lycee"],
        "ET_STATUT": "actif"
    }
    res = requests.post(f"{BASE_URL}/schools/", json=school_payload)
    print("Create School Status:", res.status_code)
    school_data = res.json()
    print("Create School Response:", school_data)
    assert res.status_code == 201, "School creation failed"
    school_id = school_data["IDETABLISSEMENT"]
    
    # 3. Create Cycles & Niveaux
    # In a clean DB we need to make sure we can fetch them
    res = requests.get(f"{BASE_URL}/classes/cycles")
    print("Get Cycles Response:", res.json())
    assert res.status_code == 200, "Fetch cycles failed"
    
    # Let's seed a test Cycle and Niveau directly in DB or check if they exist
    # To test creating a class and student, we will mock class creation by creating a student linked to school
    
    # 4. Create Student (Eleve)
    student_payload = {
        "matricule": f"HE26T{ts}",
        "prenom": "Kouassi",
        "nom": "Yao",
        "date_naissance": "2010-05-15",
        "genre": "M",
        "ecole_id": school_id,
        "statut": "actif",
        "notes_sante": "Aucune",
        "parent_password": "parentpassword123",
        "AU_QUARTIER": "Cocody",
        "AU_E_MAIL": "parent.yao@email.com"
    }
    res = requests.post(f"{BASE_URL}/students/", json=student_payload)
    print("Create Student Status:", res.status_code)
    student_data = res.json()
    print("Create Student Response:", student_data)
    assert res.status_code == 201, "Student creation failed"
    student_id = student_data["id"]
    
    # 5. Create Payment (Paiement)
    payment_payload = {
        "montant": 50000.00,
        "type": "scolarite",
        "mode": "mobile_money",
        "statut": "paye",
        "eleve_id": student_id,
        "frais_annexe_valide": True,
        "numero_transaction": "TXN-987654321"
    }
    res = requests.post(f"{BASE_URL}/finances/payments", json=payment_payload)
    print("Create Payment Status:", res.status_code)
    payment_data = res.json()
    print("Create Payment Response:", payment_data)
    assert res.status_code == 201, "Payment creation failed"
    
    # 6. Fetch payments
    res = requests.get(f"{BASE_URL}/finances/payments?eleve_id={student_id}")
    print("Get Payments Status:", res.status_code)
    print("Get Payments Response:", res.json())
    assert res.status_code == 200, "Fetch payments failed"
    
    # 7. Fetch stats
    res = requests.get(f"{BASE_URL}/finances/stats")
    print("Get Finance Stats Status:", res.status_code)
    print("Get Finance Stats Response:", res.json())
    assert res.status_code == 200, "Fetch finance stats failed"
    
    # 8. Test Authentication
    auth_payload = {
        "username": student_data["matricule"],
        "password": "parentpassword123",
        "role": "parent"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=auth_payload)
    print("Auth Parent Login Status:", res.status_code)
    print("Auth Parent Login Response:", res.json())
    assert res.status_code == 200, "Auth login failed"
    
    print("\nAPI integration tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
