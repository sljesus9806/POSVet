---
name: dashboard-kpis-en-progreso
description: Estado del panel de KPIs del dashboard — PR
metadata: 
  node_type: memory
  type: project
  originSessionId: 50ff6c1b-d438-46e0-b8ee-7ac89288bb02
---

Mejora "Dashboard de KPIs" (2026-05-30): convierte la pantalla de inicio (que seguía siendo el
placeholder de Fase 0) en un panel real. Plan en `~/.claude/plans/immutable-wishing-codd.md`.

**Estado: PR #19 MERGEADO** (2026-05-30, ya en `main`). branch
`feature/dashboard-kpis`. `npm run build` ✓ limpio (52 rutas, sin errores de tipos ni lint).

**Archivos:**
- `src/components/dashboard/kpi-card.tsx` (nuevo) — componente `KpiCard` reutilizable, sin estado,
  4 tonos (default/success/warning/danger) sobre la paleta (primary azul, accent coral, destructive rojo).
- `src/app/(dashboard)/dashboard/page.tsx` (reescrito) — server component: 4 tarjetas
  (Ventas de hoy, Tu caja, Por cobrar, Alertas de inventario) + gráfica de ventas por hora
  (`BarOrLineChart`) + accesos rápidos. Cada bloque se consulta y muestra SOLO si el usuario
  tiene el permiso (RBAC): `ventas:leer`/`reportes:leer` (ventas), `cajas:leer`/`ventas:crear`
  (caja), `cobranza:leer`/`reportes:leer` (CxC), `inventario:leer` (alertas).

**Reutiliza (regla de oro intacta, no se tocó ningún módulo de dominio):**
`reportesService.ventasDelDia` y `.antiguedadSaldosCxC`, `ventasService.cajaAbiertaDeUsuario`,
`inventarioService.alertasBajoStock` y `.alertasPorCaducar(30)`,
`ChartCard`/`BarOrLineChart` (`src/components/reportes/chart-card.tsx`),
`requireUser`/`hasPermission` (`src/lib/auth-helpers.ts`).

**Verificación visual aún pendiente** (opcional, requiere datos): `npm run db:up && npm run db:seed`,
`npm run dev`, login `admin@posvet.local`, abrir `/dashboard`; crear una venta para ver "Ventas de
hoy" y "Tu caja" con datos reales.

**Nota técnica:** se evitó el icono lucide `AlertTriangle` (riesgo de rename a `TriangleAlert`)
usando solo iconos ya presentes en `sidebar-nav.tsx`. El build confirmó que los usados existen.

**Entorno:** esta máquina (usuario jsalazar) ya tiene Node v26 + `node_modules` instalados.

Relacionado: [[posvet-estado-y-mejoras]], [[facturacion-cfdi-activada]].
