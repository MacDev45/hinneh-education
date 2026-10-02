import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8020))
    print(f"Starting FastAPI Backend Server on port {port}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="info")
