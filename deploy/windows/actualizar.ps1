<#
  Ligerito — ACTUALIZAR una instalación existente SIN perder datos.

  Hace TODO el proceso de actualización, con el servidor corriendo:
    0) Detiene el servidor que está activo (puerto 3000).
    1) Respalda la base de datos (pg_dump) — red de seguridad.
    2) Copia el código nuevo SOBRE la instalación, conservando .env, .licencia,
       los respaldos y la base de datos.
    3) npm ci  →  prisma migrate deploy  →  prisma generate  →  npm run build.
       (NO corre el seed: eso metería productos demo.)
    4) Reinicia el servidor y abre el navegador.

  Por qué NO quiebra: los datos viven en PostgreSQL (aparte del código) y
  `prisma migrate deploy` solo aplica las migraciones que faltan, en orden, sin
  borrar nada. Todas las migraciones de esta versión son aditivas.

  USO (PowerShell COMO ADMINISTRADOR, parado en la carpeta extraída del ZIP):
    .\actualizar.ps1 -Destino "C:\ruta\a\la\instalacion\actual"

  Parámetros:
    -Destino  Carpeta de la instalación que ya está corriendo (obligatorio).
    -Puerto   Puerto del servidor (default 3000).
#>
param(
  [Parameter(Mandatory = $true)][string]$Destino,
  [int]$Puerto = 3000
)

$ErrorActionPreference = "Stop"
$Origen = Split-Path -Parent $MyInvocation.MyCommand.Path
# El ZIP trae el código en su raíz; el script vive en deploy\windows\, así que
# la raíz del código nuevo está dos niveles arriba.
$OrigenRoot = (Resolve-Path (Join-Path $Origen "..\..")).Path

function Paso($m) { Write-Host "`n›› $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  ✓ $m" -ForegroundColor Green }
function Aviso($m){ Write-Host "  ! $m" -ForegroundColor Yellow }
function Morir($m){ Write-Host "`n✗ $m" -ForegroundColor Red; exit 1 }

# --- 0. Validaciones ------------------------------------------------------
if (-not (Test-Path (Join-Path $OrigenRoot "package.json"))) {
  Morir "No encuentro el código nuevo. Corre el script desde la carpeta extraída del ZIP (deploy\windows\actualizar.ps1)."
}
if (-not (Test-Path (Join-Path $Destino "package.json"))) {
  Morir "‘$Destino’ no parece una instalación de Ligerito (sin package.json)."
}
if (-not (Test-Path (Join-Path $Destino ".env"))) {
  Morir "Falta .env en ‘$Destino’. No continúo para no romper la configuración de la BD/licencia."
}
$DestinoFull = (Resolve-Path $Destino).Path
if ($OrigenRoot -eq $DestinoFull) {
  Morir "El origen y el destino son la misma carpeta. Extrae el ZIP en otra carpeta y vuelve a correr."
}

Write-Host "Actualizando Ligerito" -ForegroundColor White
Write-Host "  Código nuevo: $OrigenRoot"
Write-Host "  Instalación : $DestinoFull"

# --- 1. Detener el servidor ----------------------------------------------
Paso "Deteniendo el servidor (puerto $Puerto)…"
$pids = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if ($pids) {
  foreach ($procId in $pids) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
  Ok "Servidor detenido."
} else {
  Aviso "No había servidor escuchando (continúo)."
}

# --- 2. Respaldo de la base de datos -------------------------------------
Paso "Respaldando la base de datos…"
$respaldar = Join-Path $DestinoFull "deploy\windows\respaldar.ps1"
if (-not (Test-Path $respaldar)) {
  Morir "No encontré respaldar.ps1 en la instalación. Haz un pg_dump manual antes de seguir."
}
& powershell -ExecutionPolicy Bypass -File $respaldar
if ($LASTEXITCODE -ne 0) {
  Morir "El respaldo falló (¿PostgreSQL apagado?). NO continúo sin respaldo."
}
Ok "Respaldo hecho."

# --- 3. Copiar el código nuevo (conserva .env, .licencia, datos) ----------
Paso "Copiando el código nuevo sobre la instalación…"
# robocopy copia lo nuevo encima; NO usamos /MIR para no borrar archivos del
# destino que el ZIP no trae (.env, .licencia, node_modules, respaldos).
# Excluimos carpetas pesadas/locales que se regeneran o no deben pisarse.
$logRobo = Join-Path $env:TEMP "ligerito-robocopy.log"
robocopy $OrigenRoot $DestinoFull /E /NFL /NDL /NJH /NJS /NP `
  /XD "$DestinoFull\node_modules" "$DestinoFull\.next" "$DestinoFull\.git" "$DestinoFull\deploy\windows\logs" `
  /XF ".env" ".licencia" `
  > $logRobo 2>&1
# robocopy: códigos 0-7 = OK, 8+ = error real.
if ($LASTEXITCODE -ge 8) { Morir "La copia de archivos falló (robocopy $LASTEXITCODE). Revisa $logRobo" }
Ok "Código actualizado."

# --- 4. Dependencias, migraciones y build (SIN seed) ----------------------
Set-Location $DestinoFull
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source; if (-not $npm) { $npm = "npm.cmd" }
$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source; if (-not $npx) { $npx = "npx.cmd" }

Paso "Instalando dependencias (npm ci)…"
& $npm ci
if ($LASTEXITCODE -ne 0) { Morir "npm ci falló. La BD está intacta; revisa Node/internet y reintenta." }
Ok "Dependencias listas."

Paso "Aplicando migraciones (prisma migrate deploy)… [no borra datos]"
& $npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Morir "migrate deploy falló. La BD NO se modificó a medias (cada migración es atómica). Si quieres volver al estado previo: deploy\windows\restaurar.ps1"
}
Ok "Migraciones aplicadas."

Paso "Generando cliente Prisma…"
& $npx prisma generate | Out-Null
Ok "Cliente generado."

Paso "Reconstruyendo la app (npm run build)… (tarda unos minutos)"
& $npm run build
if ($LASTEXITCODE -ne 0) { Morir "El build falló. Revisa el error de arriba. Tus datos están intactos." }
Ok "Build listo."

# --- 5. Reiniciar el servidor --------------------------------------------
Paso "Reiniciando el servidor…"
$iniciar = Join-Path $DestinoFull "deploy\windows\iniciar.ps1"
if (Test-Path $iniciar) {
  & powershell -ExecutionPolicy Bypass -File $iniciar -Puerto $Puerto
} else {
  Aviso "No encontré iniciar.ps1; arranca el servidor a mano."
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " ✓ ACTUALIZACIÓN COMPLETA" -ForegroundColor Green
Write-Host "   Abre Chrome en http://localhost:$Puerto y verifica que los" -ForegroundColor Green
Write-Host "   productos sigan ahí. El respaldo quedó guardado por si acaso." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
