import sys
import traceback

with open("debug_err.txt", "w", encoding="utf-8") as f:
    try:
        f.write("1. Importing uvicorn...\n"); f.flush()
        import uvicorn
        
        f.write("2. Importing app.config...\n"); f.flush()
        from app.config import settings
        
        f.write("3. Importing app.database...\n"); f.flush()
        from app.database import engine
        
        f.write("4. Importing app.models...\n"); f.flush()
        from app import models
        
        f.write("5. Importing app.crud...\n"); f.flush()
        from app import crud
        
        f.write("6. Importing app.main...\n"); f.flush()
        from app.main import app
        
        f.write("7. Starting uvicorn.run...\n"); f.flush()
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except Exception as e:
        f.write(f"EXCEPTION: {e}\n")
        f.write(traceback.format_exc())
        f.flush()
