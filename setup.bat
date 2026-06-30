@echo off
setlocal
echo === ImageProcessing: Setup ===

cd /d "%~dp0"

echo [1/4] Starting PostgreSQL via Docker...
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose failed. Is Docker Desktop running?
    exit /b 1
)

echo [2/4] Installing backend...
cd backend
call install.bat
if errorlevel 1 exit /b 1
cd ..

echo [3/4] Copying .env...
if not exist .env (
    copy .env.example .env
    echo .env created from .env.example
) else (
    echo .env already exists
)

echo [4/4] Installing frontend...
cd frontend
call npm install
if errorlevel 1 exit /b 1
cd ..

echo.
echo === Setup complete ===
echo.
echo To start:
echo   Terminal 1:  cd backend ^&^& .venv\Scripts\activate ^&^& python run.py
echo   Terminal 2:  cd frontend ^&^& npm run dev
echo.
echo Backend : http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
