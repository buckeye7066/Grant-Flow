@echo off
echo Starting GrantFlow with public tunnel...
start cmd /k "cd /d G:\Apps\grantflow-local && npm run dev"
timeout /t 5
lt --port 5173 --subdomain grantflow-axiom
pause