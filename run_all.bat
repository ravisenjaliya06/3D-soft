@echo off
echo Starting Bravento Backend and Frontend...
start "Bravento Backend (Django)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe manage.py runserver 8000"
start "Bravento Frontend (Next.js)" cmd /k "cd /d %~dp0design_portal && npm run dev"
echo.
echo Both servers have been launched in separate windows:
echo - Backend:  http://127.0.0.1:8000
echo - Frontend: http://localhost:3000
echo.
