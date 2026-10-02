import traceback
import sys

try:
    print("Debug run starting...")
    import uvicorn
    import app.main
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="debug")
except Exception as e:
    with open("server_crash.txt", "w") as f:
        traceback.print_exc(file=f)
