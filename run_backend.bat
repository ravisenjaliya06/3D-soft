@echo off
cd /d "%~dp0backend"
echo Starting Django Backend...
venv\Scripts\python.exe manage.py runserver 8000
