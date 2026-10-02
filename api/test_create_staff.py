import requests
import random

def test_staff_workflow():
    base_url = "http://127.0.0.1:8000/api"
    rand_num = random.randint(1000, 9999)
    username = f"test_staff_{rand_num}"
    email = f"test_staff_{rand_num}@hinneh.ci"
    
    payload = {
        "prenom": "Test",
        "nom": f"Staff {rand_num}",
        "email": email,
        "telephone": "+225 0102030405",
        "fonction": "enseignant",
        "statut": "actif",
        "charge_horaire": 18,
        "ecole_id": 1,
        "username": username,
        "password": "securepassword123"
    }
    
    print(f"Creating staff member with username={username} and email={email}...")
    res = requests.post(f"{base_url}/staff/", json=payload)
    print("Response Status Code:", res.status_code)
    
    if res.status_code != 201:
        print("Failed to create staff member. Response:")
        print(res.text)
        return False
        
    data = res.json()
    print("Successfully created staff member:")
    print(data)
    
    staff_id = data.get("id")
    if not staff_id:
        print("Error: 'id' not found in response data.")
        return False
        
    print(f"Retrieving staff member with id={staff_id}...")
    res_get = requests.get(f"{base_url}/staff/{staff_id}")
    print("Get Status Code:", res_get.status_code)
    if res_get.status_code == 200:
        print("Get details:", res_get.json())
    else:
        print("Failed to get staff member details.")
        
    print(f"Deleting staff member with id={staff_id} for cleanup...")
    res_del = requests.delete(f"{base_url}/staff/{staff_id}")
    print("Delete Status Code:", res_del.status_code)
    if res_del.status_code == 204:
        print("Cleanup successful!")
        return True
    else:
        print("Failed to clean up / delete staff member.")
        return False

if __name__ == "__main__":
    success = test_staff_workflow()
    if success:
        print("\nAll tests passed successfully!")
    else:
        print("\nTest failed!")
