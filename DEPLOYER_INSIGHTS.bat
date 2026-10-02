@echo off
chcp 65001 > nul
echo.
echo  ╔════════════════════════════════════════════════════════════════════╗
echo  ║   HINNEH ÉDUCATION — DÉPLOIEMENT POUR EDUC.INSIGHTS-VIEW.CI         ║
echo  ║   Base de données : insights_test                                  ║
echo  ║   Port Backend    : 8020 (dédié pour educ.insights-view.ci)         ║
echo  ╚════════════════════════════════════════════════════════════════════╝
echo.

python "%~dp0build_deploy_insights.py"

echo.
pause
