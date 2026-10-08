import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8020))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting HINNEH ÉDUCATION Backend Server on {host}:{port}...", flush=True)
    print(f"API Documentation available at: http://127.0.0.1:{port}/docs", flush=True)
    uvicorn.run("app.main:app", host=host, port=port, log_level="info", reload=True)



