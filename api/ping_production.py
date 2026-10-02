import requests

def test_prod_api():
    base_url = "https://hinneh-education.ci/api"
    print(f"Testing production API at: {base_url}")
    
    endpoints = ["/health", "/schools/", "/classes/cycles", "/classes/levels"]
    for ep in endpoints:
        url = base_url + ep
        try:
            res = requests.get(url, timeout=10)
            print(f"GET {ep} -> Status: {res.status_code}")
            try:
                print(f"Response: {res.json()}")
            except:
                print(f"Response text (truncated): {res.text[:200]}")
        except Exception as e:
            print(f"GET {ep} -> Failed: {e}")

if __name__ == "__main__":
    test_prod_api()
