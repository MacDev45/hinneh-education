@echo off
title HINNEH EDUCATION - SERVEUR BACKEND FASTAPI
color 0A
echo ================================================================
echo    LANCEMENT DU SERVEUR BACKEND FASTAPI (Port 8020)
echo ================================================================
echo.

cd /d "%~dp0api"
echo Repertoire de travail : %CD%
echo Verification de Python...

python -c "import sys; print('Python version:', sys.version)"
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Python n'est pas installe ou introuvable dans le PATH.
    pause
    exit /b 1
)

echo.
echo Demarrage de Uvicorn sur http://0.0.0.0:8020 ...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8020 --reload

pause
