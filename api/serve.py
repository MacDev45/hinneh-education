import os, sys, subprocess

log_file = open("server_log.txt", "w", buffering=1, encoding="utf-8")

env = dict(os.environ)
env["PYTHONUNBUFFERED"] = "1"

print("Starting serve.py on port 8001...", file=log_file, flush=True)
process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
    env=env,
    stdout=log_file,
    stderr=subprocess.STDOUT,
    cwd=os.path.dirname(os.path.abspath(__file__))
)
process.wait()
