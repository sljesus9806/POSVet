<#
  Ligerito — Restaurar la base de datos desde un respaldo (.dump).
  ---------------------------------------------------------------------------
  DESTRUCTIVO: reemplaza el contenido actual de la base por el del respaldo.
  Úsalo solo para recuperar tras una pérdida de datos.

  Uso:
    .\restaurar.ps1 -Archivo "C:\Ligerito-Respaldos\posvet_20260609_120000.dump"
    .\restaurar.ps1 -Archivo "<...>.dump" -Si        # sin pedir confirmación

  Sugerencia: cierra la app antes (deja de usarla) para que no haya conexiones
  activas durante la restauración.
#>

param(
  [Parameter(Mandatory = $true)][string]$Archivo,
  [switch]$Si,
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path }

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "    ok  $m" -ForegroundColor Green }
function Fail($m){ Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Archivo)) { Fail "No encontré el archivo de respaldo: $Archivo" }

# Localizar pg_restore
function Find-PgRestore {
  $c = Get-Command pg_restore.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $cand = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_restore.exe" -ErrorAction SilentlyContinue |
          Sort-Object FullName -Descending | Select-Object -First 1
  if ($cand) { return $cand.FullName }
  return $null
}
$pgrestore = Find-PgRestore
if (-not $pgrestore) { Fail "No encontré pg_restore.exe. ¿Está instalado PostgreSQL?" }

# Credenciales desde .env
$DbUser = "posvet"; $DbPass = "posvet"; $DbHost = "127.0.0.1"; $DbPort = "5432"; $DbName = "posvet"
$envPath = Join-Path $RepoRoot ".env"
if (Test-Path $envPath) {
  $linea = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if ($linea -match 'postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?\s"]+)') {
    $DbUser = $matches[1]; $DbPass = $matches[2]; $DbHost = $matches[3]; $DbPort = $matches[4]; $DbName = $matches[5]
  }
}
if ($DbHost -eq "localhost") { $DbHost = "127.0.0.1" }

Write-Host ""
Write-Host "  Vas a RESTAURAR la base '$DbName' ($DbHost`:$DbPort)" -ForegroundColor Yellow
Write-Host "  desde: $Archivo" -ForegroundColor Yellow
Write-Host "  Esto REEMPLAZA los datos actuales por los del respaldo." -ForegroundColor Yellow
Write-Host ""
if (-not $Si) {
  $r = Read-Host "Escribe 'SI' para continuar"
  if ($r -ne "SI") { Fail "Cancelado." }
}

$env:PGPASSWORD = $DbPass
Info "Restaurando… (--clean --if-exists, puede tardar)"
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $pgrestore -U $DbUser -h $DbHost -p $DbPort -d $DbName --clean --if-exists --no-owner $Archivo
$code = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

# pg_restore devuelve >0 con warnings aunque restaure; avisamos pero no fallamos en seco.
if ($code -ne 0) {
  Write-Host "    !!  pg_restore terminó con código $code (suele ser por warnings de objetos ya existentes; revisa arriba)." -ForegroundColor Yellow
}
Ok "Restauración terminada. Reinicia el servidor (iniciar.ps1) si estaba corriendo."
