# Optional ML packages (TensorFlow, PyTorch, YOLO)
param(
    [ValidateSet("all", "tensorflow", "torch", "ultralytics")]
    [string]$Package = "all",
    [int]$MaxAttempts = 5
)

$ErrorActionPreference = "Stop"
$Backend = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPip = Join-Path $Backend ".venv\Scripts\pip.exe"

if (-not (Test-Path $VenvPip)) {
    Write-Host "ERROR: .venv not found. Run install.bat first." -ForegroundColor Red
    exit 1
}

$Packages = switch ($Package) {
    "tensorflow"  { @("tensorflow==2.18.0") }
    "torch"       { @("torch==2.5.1") }
    "ultralytics" { @("ultralytics==8.3.0") }
    default       { @("tensorflow==2.18.0", "torch==2.5.1", "ultralytics==8.3.0") }
}

$WheelsDir = Join-Path $Backend "wheels"
New-Item -ItemType Directory -Force -Path $WheelsDir | Out-Null

function Install-WithRetry {
    param([string]$Spec)
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        Write-Host "=== $Spec (attempt $i / $MaxAttempts) ===" -ForegroundColor Cyan
        & $VenvPip download $Spec -d $WheelsDir --retries 10 --timeout 600 --no-cache-dir
        if ($LASTEXITCODE -ne 0) { Start-Sleep 10; continue }
        & $VenvPip install --no-index --find-links $WheelsDir $Spec
        if ($LASTEXITCODE -eq 0) { Write-Host "OK: $Spec" -ForegroundColor Green; return $true }
        Start-Sleep 10
    }
    Write-Host "FAILED: $Spec" -ForegroundColor Red
    return $false
}

$Failed = @()
foreach ($spec in $Packages) {
    if (-not (Install-WithRetry -Spec $spec)) { $Failed += $spec }
}

if ($Failed.Count -eq 0) { Write-Host "=== All ML packages installed ===" -ForegroundColor Green; exit 0 }
Write-Host "Failed: $($Failed -join ', ')" -ForegroundColor Yellow
exit 1
