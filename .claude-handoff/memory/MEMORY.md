# Memoria — POSVet

- [Facturación CFDI activada](facturacion-cfdi-activada.md) — REACTIVADA 2026-06-07; módulo CFDI 4.0 construido en feature/facturacion (Facturama+demo); gotcha: precios IVA-incluido
- [Estado y mejoras](posvet-estado-y-mejoras.md) — MVP casi completo; backlog priorizado (tests, race condition stock, dashboard KPIs)
- [Dashboard KPIs](dashboard-kpis-en-progreso.md) — PR #19 abierto (build ✓); pendiente revisión/merge del usuario
- [Entorno local jsalazar](entorno-local-jsalazar.md) — Node v26, Postgres en docker, BD lista; arrancar con db:up + dev
- [Plan de pruebas funcionales](plan-pruebas-funcionales.md) — EJECUTADO 2026-05-30: capa A 208/0 + capa B 36/36; suite en scripts/qa/, reporte en docs/resultados-pruebas-2026-05-30.md; 1 bug (folio venta no concurrency-safe) → fix en PR #22
- [Licenciamiento anti-crack](licenciamiento-anticrack.md) — licencia-core MERGEADO (#28) + plataforma de monitoreo construida (repo /home/jsalazar/posvet-licencias, MVP local, verificada e2e); pendiente: cliente online en POSVet, Electron
- [Despliegue una PC Windows](despliegue-una-pc-windows.md) — cliente = 1 compu Windows server local + Chrome a localhost; scripts en deploy/windows (PR #36); el .exe Electron falló; ojo licencia + build en Windows
- [Rebrand a Ligerito (general)](ligerito-rebrand-general.md) — POS ya no es solo veterinaria → general multi-giro "Ligerito"; PR #34 abierto; frontera marca(Ligerito)/infra(POSVet) deliberada
