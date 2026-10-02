import os
import sys
import traceback

# Add api/ root to path to import app modules correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "Downloads", "zip_telechargement", "api")))

from fastapi.testclient import TestClient
from app.main import app

def test_api():
    client = TestClient(app, raise_server_exceptions=True)
    
    print("Testing GET /api/staff/:1 with raise_server_exceptions=True:")
    try:
        response = client.get("/api/staff/:1")
        print("Status:", response.status_code)
        print("JSON:", response.json())
    except Exception as e:
        print("Exception caught:")
        traceback.print_exc()

if __name__ == "__main__":
    test_api()
