<#
  Ligerito — Instalación en UNA sola PC con Windows (la PC es el servidor).
  ---------------------------------------------------------------------------
  Lo corre UNA VEZ quien instala (no la usuaria final). Es idempotente: puedes
  volver a correrlo sin romper nada.

  Qué hace:
    1. Instala Node LTS y PostgreSQL (vía winget) si faltan.
    2. Crea la base de datos y el usuario de Postgres.
    3. Genera el archivo .env de producción (con un AUTH_SECRET nuevo).
    4. Instala dependencias, construye la app, migra y siembra datos.
    5. Instala la licencia offline (archivo licencia.token) si está presente.
    6. Deja el arranque automático al iniciar sesión + un acceso directo.

  Uso (PowerShell, idealmente como Administrador para que winget pueda instalar):
    .\instalar.ps1
    .\instalar.ps1 -Puerto 3000 -PgSuperPassword "tu_password_postgres"

  Después, la usuaria solo prende la compu y abre Chrome en  http://localhost:3000
#>

param(
  [int]$Puerto = 3000,
  [string]$PgSuperPassword = "",
  [string]$TokenLicencia = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "    ok  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "    !!  $m" -ForegroundColor Yellow }
function Fail($m){ Write-Host "ERROR: $m" -ForegroundColor Red; exit 1 }

function Run([string]$exe, [string[]]$exeArgs) {
  & $exe @exeArgs
  if ($LASTEXITCODE -ne 0) { Fail "Falló: $exe $($exeArgs -join ' ')" }
}

Write-Host ""
Write-Host "  Ligerito — instalación local (Windows)" -ForegroundColor White
Write-Host "  Repo: $RepoRoot"
Write-Host ""

# --- 0. winget disponible ------------------------------------------------
$tieneWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
if (-not $tieneWinget) {
  Warn "No encontré 'winget'. En Windows 10/11 viene con 'Instalador de aplicaciones' (Microsoft Store)."
  Warn "Si no lo tienes, instala Node 20+ y PostgreSQL a mano y vuelve a correr este script."
}

# --- 1. Node -------------------------------------------------------------
Info "Comprobando Node.js…"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (-not $tieneWinget) { Fail "Falta Node.js y no hay winget. Instala Node 20+ desde https://nodejs.org y reintenta." }
  Info "Instalando Node LTS (winget)…"
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node no quedó en el PATH. Cierra y vuelve a abrir PowerShell, o reinicia, y reintenta."
}
Ok "Node $(node -v)"

# --- 2. PostgreSQL -------------------------------------------------------
function Find-Psql {
  $c = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $cand = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
          Sort-Object FullName -Descending | Select-Object -First 1
  if ($cand) { return $cand.FullName }
  return $null
}

Info "Comprobando PostgreSQL…"
$psql = Find-Psql
if (-not $psql) {
  if (-not $tieneWinget) { Fail "Falta PostgreSQL y no hay winget. Instálalo desde https://www.postgresql.org/download/windows/ y reintenta." }
  Info "Instalando PostgreSQL (winget). Si abre un asistente, acepta los valores por defecto y ANOTA la contraseña de 'postgres'."
  winget install -e --id PostgreSQL.PostgreSQL.17 --accept-package-agreements --accept-source-agreements
  $psql = Find-Psql
}
if (-not $psql) { Fail "No encontré psql tras instalar PostgreSQL. Instálalo a mano y reintenta." }
Ok "psql: $psql"

# El servicio de Postgres arranca solo al prender la PC (servicio de Windows).
$pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgSvc) {
  if ($pgSvc.Status -ne "Running") { Start-Service $pgSvc.Name }
  Set-Service -Name $pgSvc.Name -StartupType Automatic -ErrorAction SilentlyContinue
  Ok "Servicio $($pgSvc.Name): $((Get-Service $pgSvc.Name).Status), arranque automático"
} else {
  Warn "No vi el servicio de PostgreSQL; asegúrate de que esté corriendo en el puerto 5432."
}

# --- 3. Base de datos + usuario -----------------------------------------
$DbUser = "posvet"; $DbPass = "posvet"; $DbName = "posvet"
if (-not $PgSuperPassword) {
  $sec = Read-Host "Contraseña del superusuario 'postgres' de PostgreSQL" -AsSecureString
  $PgSuperPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
$env:PGPASSWORD = $PgSuperPassword

Info "Creando base de datos y usuario…"
# CREATE ROLE falla si ya existe; lo ignoramos (idempotente).
try { & $psql -U postgres -h localhost -p 5432 -c "CREATE ROLE $DbUser LOGIN PASSWORD '$DbPass'" 2>&1 | Out-Null } catch { }
$existeDb = (& $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") 2>$null
if ("$existeDb".Trim() -ne "1") {
  Run $psql @("-U","postgres","-h","localhost","-p","5432","-c","CREATE DATABASE $DbName OWNER $DbUser")
  Ok "Base '$DbName' creada"
} else {
  Ok "Base '$DbName' ya existía"
}
$DatabaseUrl = "postgresql://${DbUser}:${DbPass}@localhost:5432/${DbName}?schema=public"

# --- 4. Archivo .env -----------------------------------------------------
$envPath = Join-Path $RepoRoot ".env"
if (Test-Path $envPath) {
  Ok ".env ya existe — lo dejo como está (bórralo si quieres regenerarlo)"
} else {
  Info "Generando .env de producción…"
  $authSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  $envContent = @"
# Generado por deploy/windows/instalar.ps1
DATABASE_URL="$DatabaseUrl"
AUTH_SECRET="$authSecret"
AUTH_URL="http://localhost:$Puerto"
AUTH_TRUST_HOST="true"

# Facturación: arranca en modo prueba. Para timbrar real, ver docs/Guia-Facturacion.md
FACTURACION_MODO="demo"
FACTURACION_SERIE="A"
FACTURACION_CLAVE_PROD_SERV="01010101"
FACTURACION_CLAVE_UNIDAD="H87"
FACTURAMA_API_URL="https://apisandbox.facturama.mx"
FACTURAMA_USER=""
FACTURAMA_PASSWORD=""

SEED_ADMIN_EMAIL="admin@posvet.local"
SEED_ADMIN_PASSWORD="admin12345"
SEED_ADMIN_NOMBRE="Administrador"
"@
  Set-Content -Path $envPath -Value $envContent -Encoding UTF8
  Ok ".env creado"
}
# Para que prisma/tsx vean la BD en este mismo proceso:
$env:DATABASE_URL = $DatabaseUrl

# --- 5. Dependencias, build, migraciones, seed ---------------------------
Push-Location $RepoRoot
try {
  Info "Instalando dependencias (npm ci)…"
  Run "npm" @("ci")

  Info "Generando cliente de Prisma para Windows…"
  Run "npx" @("prisma","generate")

  Info "Construyendo la app (npm run build)… (tarda unos minutos)"
  Run "npm" @("run","build")

  Info "Aplicando migraciones…"
  Run "npx" @("prisma","migrate","deploy")

  Info "Sembrando datos iniciales…"
  Run "npx" @("prisma","db","seed")
}
finally { Pop-Location }
Ok "App construida y base lista"

# --- 6. Licencia offline -------------------------------------------------
if (-not $TokenLicencia) {
  $tokenDefault = Join-Path $ScriptDir "licencia.token"
  if (Test-Path $tokenDefault) { $TokenLicencia = $tokenDefault }
}
if ($TokenLicencia -and (Test-Path $TokenLicencia)) {
  Info "Instalando licencia offline…"
  Push-Location $RepoRoot
  try { Run "npm" @("run","lic:instalar","--","--archivo","$TokenLicencia") }
  finally { Pop-Location }
  Ok "Licencia instalada"
} else {
  Warn "SIN licencia: la app quedará BLOQUEADA (pantalla /licencia) hasta instalar una."
  Warn "En TU PC de desarrollo (la que tiene la llave privada):"
  Warn "    npm run lic:emitir -- --cliente `"Nombre del negocio`" --modo offline --meses 120"
  Warn "Copia el token a:  $((Join-Path $ScriptDir 'licencia.token'))"
  Warn "y vuelve a correr este instalador (o:  npm run lic:instalar -- --archivo <token>)."
}

# --- 7. Arranque automático + accesos directos ---------------------------
Info "Configurando arranque automático…"
$iniciarPs1 = Join-Path $ScriptDir "iniciar.ps1"
$startup = [Environment]::GetFolderPath("Startup")
$wsh = New-Object -ComObject WScript.Shell

$lnk = $wsh.CreateShortcut((Join-Path $startup "Ligerito (servidor).lnk"))
$lnk.TargetPath = "powershell.exe"
$lnk.Arguments  = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$iniciarPs1`" -Puerto $Puerto"
$lnk.WorkingDirectory = $RepoRoot
$lnk.Description = "Arranca el servidor de Ligerito"
$lnk.Save()
Ok "Se arrancará solo al iniciar sesión en Windows"

# Acceso directo en el Escritorio que abre la app en el navegador.
$desktop = [Environment]::GetFolderPath("Desktop")
$url = "http://localhost:$Puerto"
Set-Content -Path (Join-Path $desktop "Ligerito.url") -Encoding ASCII -Value @"
[InternetShortcut]
URL=$url
"@
Ok "Icono 'Ligerito' en el Escritorio"

# Arrancar ya el servidor para esta primera vez.
Info "Arrancando el servidor por primera vez…"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $iniciarPs1 -Puerto $Puerto

Write-Host ""
Write-Host "  LISTO." -ForegroundColor Green
Write-Host "  Abre Chrome en:  $url" -ForegroundColor White
Write-Host "  Usuario: admin@posvet.local   Contraseña: admin12345" -ForegroundColor White
Write-Host "  (cámbiala en Usuarios después del primer ingreso)" -ForegroundColor DarkGray
Write-Host ""
