import time
import sys

routers = [
    'auth', 'schools', 'classes', 'students', 'staff',
    'grades', 'finances', 'requests', 'salles', 'courriers',
    'stocks', 'taches', 'archives', 'uploads', 'transport',
    'echeancier', 'caisse'
]

print("Starting router import check...", flush=True)
for r in routers:
    t0 = time.time()
    try:
        mod = __import__(f"app.routers.{r}", fromlist=["router"])
        t1 = time.time()
        print(f"Imported app.routers.{r} in {t1-t0:.3f}s", flush=True)
    except Exception as e:
        print(f"Error importing app.routers.{r}: {e}", flush=True)

print("Import check complete!", flush=True)
