---
name: entorno-local-jsalazar
description: Entorno de dev de jsalazar — vuelve a Linux (2026-06-09); el bloque Windows pasa a referencia
metadata: 
  node_type: memory
  type: project
  originSessionId: f7b4d484-5ad1-4f15-8dd7-73ad131fd21f
---

**2026-06-09: jsalazar VUELVE a Linux** y vuelve a snapshotear estas memorias a `.claude-handoff/memory/` para restaurarlas allá (decirle a Claude "restaura mis memorias desde `.claude-handoff/memory`"). En la 1ª sesión Linux **reconfirma**: ruta del proyecto y **slug** de memoria (`~/.claude/projects/<slug>/memory/`), shell, y cómo corre Postgres. El bloque "Windows" de abajo pasa a ser referencia (sigue válido si vuelve a esa PC). Trabajo reciente que debe estar en GitHub: **PR #40** (buscador ventas autocompletar), **PR #41** (recupera los arreglos de deploy varados del squash de #39) — revisar que ambos estén mergeados a `main`. Ver [[despliegue-una-pc-windows]].

**(Referencia) 2026-06-08: estuvo en Windows — memorias restauradas desde `.claude-handoff/memory`.** Confirmado esa sesión Windows:
- **Ruta del proyecto:** `C:\Users\jsalazar\Downloads\POSVet-main (1)\POSVet-main` (extraído de un ZIP, no `git clone` → **NO es repo git** en este equipo; el "(1)" es del descomprimido). Slug de memoria: `C--Users-jsalazar-Downloads-POSVet-main--1--POSVet-main`.
- **Shell:** PowerShell (Windows 11 Pro). Bash también disponible vía la tool Bash.
- **Git/GitHub:** la carpeta YA es repo git (git init + remoto `https://github.com/sljesus9806/POSVet`, trackeando `origin/main`). **GOTCHA de cuentas:** esta PC tiene DOS cuentas en gh — `sljesus98` y `sljesus9806`. El repo es de **`sljesus9806`**; `sljesus98` NO tiene push (da 403). Además git usaba **Git Credential Manager** (`credential.helper=manager`) con el token de `sljesus98` cacheado, ignorando gh. Fix aplicado (persistente): `gh auth switch` a `sljesus9806` + `gh auth setup-git` (puso gh como credential helper para github.com). Si vuelve a fallar el push con 403, revisa `gh auth status` (cuenta activa) y reaplica `gh auth setup-git`.
- **Node:** v24.16 en esta PC. **Build validado en Windows** (`npm ci`+`prisma generate`+`npm run build` ✓, ver [[despliegue-una-pc-windows]]). `node_modules` ya instalado.
- **Pendiente de confirmar:** Postgres en este equipo (¿Docker Desktop vs PostgreSQL como servicio?) — aún no hay BD viva aquí.

**Lo que NO cambia:** el código está en GitHub (`sljesus9806/POSVet`), ramas y PRs intactos (#35 facturación, #36 despliegue Windows). Admin de seed: `admin@posvet.local` / `admin12345`. `.env` no se commitea (se regenera).

**(Histórico 2026-06-07):** jsalazar cambió ESTE equipo de CachyOS/Arch (Linux) a Windows; el cliente destino usa Windows. Gotchas de Linux ya NO aplican: `sg docker -c "..."`, `sudo` sin tty, grupo `docker`, pacman, Node en `/usr/bin`.

**Setup viejo (Linux, ya no vigente):** CachyOS/Arch, Node v26.1.0 (pacman), Postgres 16 en Docker `posvet-db-dev` (volumen `posvet_pg_data`), BD migrada+seedeada, jsalazar en grupo `docker`. Arrancaba con `npm run db:up` → `npm run dev` → http://localhost:3000.

Relacionado: [[despliegue-una-pc-windows]], [[posvet-estado-y-mejoras]].
