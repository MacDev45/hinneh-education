@echo off
title HINNEH EDUCATION - IMPORT DES PAIEMENTS EXCEL
color 0B
echo ================================================================
echo    MODULE D'IMPORTATION DES PAIEMENTS EXCEL
echo    Groupe Scolaire Hinneh Education
echo ================================================================
echo.

cd /d "%~dp0api"

echo Fichier cible par defaut : import\eleve_detailpaiements (1).xlsx
echo.
echo Choisissez une option :
echo   [1] Lancer l'importation REELLE en base de donnees
echo   [2] Lancer une SIMULATION a blanc (Dry-Run, sans ecriture)
echo   [3] Quitter
echo.
set /p choix="Votre choix (1, 2 ou 3) : "

if "%choix%"=="1" (
    echo.
    echo [LANCEMENT DE L'IMPORTATION REELLE...]
    python -m app.services.excel_payment_importer
) else if "%choix%"=="2" (
    echo.
    echo [LANCEMENT DE LA SIMULATION DRY-RUN...]
    python -m app.services.excel_payment_importer --dry-run
) else (
    echo Annulation.
    exit /b 0
)

echo.
echo ================================================================
pause
