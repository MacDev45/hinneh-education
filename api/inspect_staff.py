import os
import sys

# Add api/ root to path to import app modules correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "Downloads", "zip_telechargement", "api")))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

def test_api():
    client = TestClient(app)
    db = SessionLocal()
    
    # Let's find a valid staff id from the db (using SQLite or MySQL based on actual config)
    staff = db.query(models.Personnel).first()
    if not staff:
        print("No staff found in DB to test PUT.")
        return
        
    staff_id = staff.id
    print(f"Testing PUT /api/staff/{staff_id} with frontend payload style:")
    payload = {
        "first_name": "TestPrenom",
        "last_name": "TestNom",
        "email": staff.email,
        "fonction": "enseignant",
        "statut": "actif"
    }
    
    try:
        response = client.put(f"/api/staff/{staff_id}", json=payload)
        print("Status:", response.status_code)
        print("JSON:", response.json())
    except Exception as e:
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    test_api()
