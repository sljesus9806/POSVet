---
name: entorno-local-jsalazar
description: Entorno de dev de jsalazar — MIGRANDO de Linux a Windows (2026-06-07); detalles Linux abajo OBSOLETOS
metadata: 
  node_type: memory
  type: project
  originSessionId: f7b4d484-5ad1-4f15-8dd7-73ad131fd21f
---

**2026-06-07: jsalazar está cambiando ESTE equipo de CachyOS/Arch (Linux) a Windows.** Motivo: el cliente destino usa Windows y así puede probar de verdad los scripts de [[despliegue-una-pc-windows]] (PR #36). Todo lo de "Linux" de abajo queda OBSOLETO; reconfírmalo en la primera sesión en Windows.

**Lo que NO cambia:** el código está en GitHub (`sljesus9806/POSVet`), ramas y PRs intactos (#35 facturación, #36 despliegue Windows). Admin de seed: `admin@posvet.local` / `admin12345`. `.env` no se commitea (se regenera).

**A confirmar/ajustar en Windows (primera sesión):**
- **Ruta del proyecto** ya no es `/home/jsalazar/POSVet` → será algo como `C:\Users\jsalazar\POSVet`. Esto cambia el slug de la carpeta de memoria (`%USERPROFILE%\.claude\projects\<slug>\memory\`).
- **Shell** ya no es fish → PowerShell/cmd.
- **Postgres**: ya no hay contenedor `posvet-db-dev` ni `sg docker`. Opciones: Docker Desktop (`npm run db:up`) o PostgreSQL como servicio (lo que usa el instalador de `deploy/windows/`).
- Quedan SIN aplicar los gotchas de Linux: `sg docker -c "..."`, `sudo` sin tty, grupo `docker`, pacman, Node en `/usr/bin`.

**Setup viejo (Linux, ya no vigente):** CachyOS/Arch, Node v26.1.0 (pacman), Postgres 16 en Docker `posvet-db-dev` (volumen `posvet_pg_data`), BD migrada+seedeada, jsalazar en grupo `docker`. Arrancaba con `npm run db:up` → `npm run dev` → http://localhost:3000.

Relacionado: [[despliegue-una-pc-windows]], [[posvet-estado-y-mejoras]].
