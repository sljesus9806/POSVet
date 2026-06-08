---
name: despliegue-una-pc-windows
description: "Despliegue elegido para el cliente: una sola PC Windows = servidor local, entra por Chrome a localhost"
metadata: 
  node_type: memory
  type: project
  originSessionId: f7b4d484-5ad1-4f15-8dd7-73ad131fd21f
---

El cliente destino corre en **una sola PC con Windows**: esa PC es el servidor y la persona entra por **Chrome a `http://localhost:3000`** (favorito). El **empaquetado de escritorio Electron falló al construir el `.exe`** (electron-builder/NSIS), así que se descartó. Pivoteo: scripts de Windows en `deploy/windows/` (PR #36, rama `chore/deploy-windows-local`): `instalar.ps1` (una vez: Node+PostgreSQL por winget como servicio, crea BD, genera `.env` prod, `npm ci`+build+`migrate deploy`+seed, instala licencia, registra autoarranque) e `iniciar.ps1` (cada login: levanta `next start` en puerto fijo y abre el navegador). Postgres = **servicio de Windows** (no embebido, no Docker).

**Why:** Es lo más simple y estable para una sola compu sin conocimientos técnicos; el uso diario queda 100% sin internet.

**How to apply:** Dos cosas SIEMPRE muerden — (1) **Candado de licencia**: en producción (`next start`), sin licencia instalada el layout redirige a `/licencia` y bloquea (el bypass de dev NO aplica en producción). Hay que emitir token offline en la PC con la llave privada (`npm run lic:emitir -- --cliente "X" --modo offline --meses 120`) y dejarlo en `deploy/windows/licencia.token` antes de instalar. (2) **El build se hace en Windows**: el motor binario de Prisma es por SO, no se puede mandar precompilado desde Linux → por eso el instalador construye en la PC del cliente. Solo la instalación necesita internet (bajar Node/PG/deps). Scripts escritos pero NO probados en Windows real. Relacionado: [[licenciamiento-anticrack]], [[facturacion-cfdi-activada]].
