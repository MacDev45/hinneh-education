import requests

url = "http://localhost:8000/api/students/import"

# Create a simple CSV file contents
csv_data = """matricule,prenom,nom,date_naissance,genre,ecole_id,classe,statut,notes_sante
HE20261111,Kouassi,Yao,2010-05-15,M,1,6ème,actif,Aucune
"""

files = {'file': ('students.csv', csv_data, 'text/csv')}

try:
    response = requests.post(url, files=files)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
