@echo off
setlocal
echo === ImageProcessing Backend: Python 3.12 venv ===
echo.
echo NOTE: Python 3.14 is NOT supported. Use Python 3.12.
echo.

where py >nul 2>&1
if errorlevel 1 (
    echo ERROR: py launcher not found. Install Python 3.12.
    exit /b 1
)

py -3.12 -c "import sys" 2>nul
if errorlevel 1 (
    echo ERROR: Python 3.12 not found.
    exit /b 1
)

if not exist .venv (
    py -3.12 -m venv .venv
    if errorlevel 1 exit /b 1
)

call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install --retries 5 --timeout 120 -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed.
    exit /b 1
)

echo.
echo === Core install complete ===
echo TensorFlow/PyTorch/YOLO are OPTIONAL. Run install-ml.bat to add them.
echo Activate : .venv\Scripts\activate
echo Run      : python run.py
