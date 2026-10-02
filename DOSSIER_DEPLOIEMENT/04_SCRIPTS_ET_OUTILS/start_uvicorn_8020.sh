#!/bin/bash
# Demarrage Uvicorn en arriere-plan sur le port 8020 (hinneh-education.ci)
echo "Demarrage API FastAPI sur port 8020..."
screen -dmS educ_api_8020 bash -c 'APP_ENV=production uvicorn app.main:app --host 127.0.0.1 --port 8020 >> /tmp/uvicorn_8020.log 2>&1'
echo "Service educ_api_8020 lance avec succes."
