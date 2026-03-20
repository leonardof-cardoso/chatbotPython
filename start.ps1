$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root "backend\.venv\Scripts\python.exe"
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

try {
  $existingProcessIds = @(
    netstat -ano | Select-String ":8000|:5500" | ForEach-Object {
      $parts = ($_ -split "\s+") | Where-Object { $_ }
      if ($parts.Length -ge 5) { $parts[-1] }
    }
  ) | Where-Object { $_ -match "^\d+$" } | Select-Object -Unique

  foreach ($processId in $existingProcessIds) {
    taskkill /PID $processId /F | Out-Null
  }
}
catch {
}

if (-not (Test-Path $python)) {
  Write-Host ""
  Write-Host "Python da virtualenv nao encontrado em backend\.venv\Scripts\python.exe" -ForegroundColor Red
  Write-Host "Crie a virtualenv antes de usar este script." -ForegroundColor Yellow
  exit 1
}

$backendJob = $null
$frontendJob = $null
try {
  Write-Host ""
  Write-Host "Iniciando backend em http://127.0.0.1:8000 ..." -ForegroundColor Cyan
  $backendJob = Start-Job -Name "chatbot-backend" -ScriptBlock {
    param($pythonPath, $workingDir)
    Set-Location $workingDir
    & $pythonPath -m uvicorn app.main:app --reload
  } -ArgumentList $python, $backendDir

  Write-Host "Iniciando frontend em http://127.0.0.1:5500 ..." -ForegroundColor Cyan
  $frontendJob = Start-Job -Name "chatbot-frontend" -ScriptBlock {
    param($pythonPath, $workingDir)
    Set-Location $workingDir
    & $pythonPath -m http.server 5500
  } -ArgumentList $python, $frontendDir

  Start-Sleep -Seconds 3
  Start-Process "http://127.0.0.1:5500"

  Write-Host ""
  Write-Host "Projeto iniciado." -ForegroundColor Green
  Write-Host "Frontend:      http://127.0.0.1:5500" -ForegroundColor Green
  Write-Host "Backend API:   http://127.0.0.1:8000" -ForegroundColor Green
  Write-Host "API health:    http://127.0.0.1:8000/health" -ForegroundColor Green
  Write-Host ""
  Write-Host "Pressione Ctrl+C para encerrar tudo." -ForegroundColor Yellow
  Write-Host ""

  while ($true) {
    if ($backendJob.State -match "Completed|Failed|Stopped") {
      Write-Host "Backend encerrou com estado: $($backendJob.State)" -ForegroundColor Red
      Receive-Job $backendJob -Keep
      break
    }

    if ($frontendJob.State -match "Completed|Failed|Stopped") {
      Write-Host "Frontend encerrou com estado: $($frontendJob.State)" -ForegroundColor Red
      Receive-Job $frontendJob -Keep
      break
    }

    Start-Sleep -Seconds 2
  }
}
finally {
  if ($backendJob) {
    Stop-Job $backendJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $backendJob -ErrorAction SilentlyContinue | Out-Null
  }

  if ($frontendJob) {
    Stop-Job $frontendJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $frontendJob -ErrorAction SilentlyContinue | Out-Null
  }
}
