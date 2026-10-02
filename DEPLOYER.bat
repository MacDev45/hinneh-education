@echo off
chcp 65001 > nul
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║   HINNEH EDUCATION — Generation Deploiement Production      ║
echo  ║   Domaine : hinneh-education.ci  ^|  BD : insights_central    ║
echo  ║   Zero Erreur 404, 503, 500, 502, CORS                       ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

if exist "%~dp0build_all_deployment_dirs.py" (
    python "%~dp0build_all_deployment_dirs.py"
) else if exist "%~dp0310526\build_all_deployment_dirs.py" (
    python "%~dp0310526\build_all_deployment_dirs.py"
)
pause
