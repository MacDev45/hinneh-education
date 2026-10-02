import requests

def test_prod_api_more():
    base_url = "https://hinneh-education.ci/api"
    print(f"Testing more production API endpoints at: {base_url}")
    
    endpoints = ["/staff/", "/classes/", "/classes/subjects", "/classes/attributions"]
    for ep in endpoints:
        url = base_url + ep
        try:
            res = requests.get(url, timeout=10)
            print(f"GET {ep} -> Status: {res.status_code}")
            try:
                data = res.json()
                print(f"Response size: {len(data)} items")
                if len(data) > 0:
                    print(f"First item: {data[0]}")
            except Exception as json_err:
                print(f"Failed to parse JSON: {json_err}. Text: {res.text[:200]}")
        except Exception as e:
            print(f"GET {ep} -> Failed: {e}")

if __name__ == "__main__":
    test_prod_api_more()
