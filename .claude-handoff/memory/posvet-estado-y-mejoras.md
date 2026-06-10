---
name: posvet-estado-y-mejoras
description: Estado del POSVet a mayo 2026 y backlog de mejoras priorizado tras análisis
metadata: 
  node_type: memory
  type: project
  originSessionId: 50ff6c1b-d438-46e0-b8ee-7ac89288bb02
---

A 2026-05-30 el POSVet tenía implementados y mergeados (19 PRs, incl. suite de QA) todos los módulos del MVP: auth/usuarios+RBAC, productos/inventario, proveedores, clientes, ventas/POS, compras, cuentas-pagar, crédito/cobranza, configuración, UI/tema, reportes (7 con gráficas y PDF). **Actualización 2026-06-08: facturación CFDI 4.0 también está MERGEADA** ([[facturacion-cfdi-activada]], PR #35) — el MVP fiscal ya está en `main`.

Análisis de mejoras pendientes (no derivable de un solo archivo — resultado de revisar todo el repo):
- **Tests** — ya existe la suite de QA de integración en `scripts/qa/` (PR #21 mergeada: capa A 208/0 + smoke web 36/36). Falta cobertura unitaria y correrla en CI. Ver [[plan-pruebas-funcionales]].
- **Race condition en descuento de stock — RESUELTA en PR #22** (MERGEADO 2026-05-30): `aplicarSalidaPorVenta` usa `updateMany WHERE stock >= cantidad` + `{ decrement }` (atómico) y `crearVenta` reintenta ante colisión de folio. El mismo patrón read-check-write SIGUE en `ajustarStock` y `crearTransferencia` (salida) → follow-up.
- **Event-bus decorativo** — ~30 `eventBus.emit` pero CERO suscriptores; la comunicación real es por llamadas directas a servicios.
- **Dashboard de KPIs — PR #19 MERGEADO** (2026-05-30): reemplaza el placeholder de Fase 0 por un panel real reusando servicios de reportes. Ver [[dashboard-kpis-en-progreso]].
- **Export CSV (#24), bitácora de auditoría (#25) y corte de caja (#26) — HECHOS.** Auditoría: módulo `auditoria` solo-lectura + `/auditoria` (filtros + paginación) + `/auditoria/[id]`; permiso `auditoria:leer`, solo ADMIN. Corte de caja: `/reportes/corte-caja` (resumen por rango) + `/reportes/corte-caja/[id]` (corte formal por caja, reusa `ventasService.obtenerCaja`) con PDF/CSV. Falta aún: **margen por producto**, **recuperación de contraseña por email**, **CI** (correr `scripts/qa` en PRs), y Excel nativo `.xlsx` (requiere librería).

**How to apply:** Usar esto como backlog al decidir el próximo módulo. Confirmar prioridad con el usuario antes de arrancar.
