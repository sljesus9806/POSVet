<#
  Ligerito — Respaldo de la base de datos (PostgreSQL).
  ---------------------------------------------------------------------------
  Lo corre la Tarea Programada de Windows cada 30 minutos (lo registra
  instalar.ps1), pero también puedes ejecutarlo a mano cuando quieras.

  Qué hace:
    1. Localiza pg_dump.
    2. Lee las credenciales de la BD desde el .env del proyecto (DATABASE_URL).
    3. Genera un respaldo COMPRIMIDO (formato custom de pg_dump → .dump).
    4. Borra los respaldos con más de N días (retención).
    5. Deja una bitácora en <Destino>\respaldos.log

  Uso:
    .\respaldar.ps1
    .\respaldar.ps1 -Destino "D:\Respaldos" -DiasRetencion 14
#>

param(
  [string]$Destino = "C:\Ligerito-Respaldos",
  [int]$DiasRetencion = 7,
  [string]$RepoRoot = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path }

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$logFile = Join-Path $Destino "respaldos.log"
function Log($m) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  Add-Content -Path $logFile -Value $line
  Write-Host $line
}

# --- 1. Localizar pg_dump ------------------------------------------------
function Find-PgDump {
  $c = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $cand = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
          Sort-Object FullName -Descending | Select-Object -First 1
  if ($cand) { return $cand.FullName }
  return $null
}
$pgdump = Find-PgDump
if (-not $pgdump) { Log "ERROR: no encontré pg_dump.exe. ¿Está instalado PostgreSQL?"; exit 1 }

# --- 2. Credenciales desde .env (con fallback a los valores del instalador) --
$DbUser = "posvet"; $DbPass = "posvet"; $DbHost = "127.0.0.1"; $DbPort = "5432"; $DbName = "posvet"
$envPath = Join-Path $RepoRoot ".env"
if (Test-Path $envPath) {
  $linea = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if ($linea -match 'postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?\s"]+)') {
    $DbUser = $matches[1]; $DbPass = $matches[2]; $DbHost = $matches[3]; $DbPort = $matches[4]; $DbName = $matches[5]
  }
}
if ($DbHost -eq "localhost") { $DbHost = "127.0.0.1" }  # IPv4 explícito (evita titubeo IPv6)

# --- 3. Respaldo ---------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archivo = Join-Path $Destino ("{0}_{1}.dump" -f $DbName, $stamp)
$env:PGPASSWORD = $DbPass

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"   # pg_dump puede escribir a stderr; no queremos abortar por eso
& $pgdump -U $DbUser -h $DbHost -p $DbPort -d $DbName -Fc -f $archivo
$code = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($code -ne 0 -or -not (Test-Path $archivo)) {
  Log "ERROR: pg_dump falló (código $code). No se generó el respaldo."
  exit 1
}
$kb = [Math]::Round((Get-Item $archivo).Length / 1KB, 1)
Log ("OK respaldo: {0} ({1} KB)" -f (Split-Path $archivo -Leaf), $kb)

# --- 4. Retención: borrar respaldos más viejos que N días ----------------
$limite = (Get-Date).AddDays(-$DiasRetencion)
$viejos = Get-ChildItem (Join-Path $Destino "*.dump") -ErrorAction SilentlyContinue |
          Where-Object { $_.LastWriteTime -lt $limite }
foreach ($f in $viejos) {
  Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
  Log ("purgado (>{0}d): {1}" -f $DiasRetencion, $f.Name)
}

exit 0
