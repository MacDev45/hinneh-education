import requests
import subprocess
import time
import os

def test():
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///school_educ.db"
    
    print("Starting FastAPI server in background...")
    proc = subprocess.Popen(
        ["python", "run.py"],
        cwd=r"c:\Users\dagno\Downloads\zip_telechargement\api",
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(3)
    
    try:
        print("Sending request to http://localhost:8000/api/staff/999 (should be 404) ...")
        res = requests.get("http://localhost:8000/api/staff/999")
        print("Status Code:", res.status_code)
        print("Response JSON:", res.json() if res.status_code == 200 or res.status_code == 422 or res.status_code == 500 or res.status_code == 404 else res.text)
    except Exception as e:
        print("Error sending request:", e)
    finally:
        print("Terminating server...")
        proc.terminate()
        proc.wait()
        
        stdout, stderr = proc.communicate()
        print("\nSERVER STDOUT:")
        print(stdout.decode('utf-8', errors='ignore'))
        print("\nSERVER STDERR:")
        print(stderr.decode('utf-8', errors='ignore'))

if __name__ == "__main__":
    test()
