<#
  Ligerito — arranque del servidor local. Se ejecuta SOLO al iniciar sesión en
  Windows (lo registra instalar.ps1). También puedes correrlo a mano.

  - Asegura que PostgreSQL esté corriendo.
  - Si el servidor ya responde, solo abre el navegador.
  - Si no, arranca el servidor (oculto, en segundo plano) y luego abre el navegador.
#>

param(
  [int]$Puerto = 3000
)

$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$LogDir = Join-Path $ScriptDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Url = "http://localhost:$Puerto"

function Responde {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "$Url/login" -TimeoutSec 3 | Out-Null
    return $true
  } catch { return $false }
}

# 1. PostgreSQL arriba (normalmente ya arrancó solo como servicio).
$pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgSvc -and $pgSvc.Status -ne "Running") {
  Start-Service $pgSvc.Name
  Start-Sleep -Seconds 3
}

# 2. ¿Ya está corriendo el servidor? Entonces solo abrir el navegador.
if (Responde) {
  Start-Process $Url
  exit 0
}

# 3. Arrancar el servidor de Next en producción, oculto y en segundo plano.
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { $npm = "npm.cmd" }
$env:PORT = "$Puerto"
$stamp = Get-Date -Format "yyyyMMdd"
Start-Process -FilePath $npm `
  -ArgumentList "run","start","--","-p","$Puerto" `
  -WorkingDirectory $RepoRoot -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir "server-$stamp.out.log") `
  -RedirectStandardError  (Join-Path $LogDir "server-$stamp.err.log")

# 4. Esperar a que levante (hasta ~60s) y abrir el navegador.
for ($i = 0; $i -lt 60; $i++) {
  if (Responde) { break }
  Start-Sleep -Seconds 1
}
Start-Process $Url
