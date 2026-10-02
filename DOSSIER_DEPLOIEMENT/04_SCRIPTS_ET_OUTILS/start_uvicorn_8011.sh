#!/bin/bash
# Demarrage Uvicorn en arriere-plan sur le port 8011 (educ.insights-view.ci)
echo "Demarrage API FastAPI sur port 8011..."
screen -dmS educ_api_8011 bash -c 'APP_ENV=production uvicorn app.main:app --host 127.0.0.1 --port 8011 >> /tmp/uvicorn_8011.log 2>&1'
echo "Service educ_api_8011 lance avec succes."
