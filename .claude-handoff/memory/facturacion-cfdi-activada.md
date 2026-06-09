---
name: facturacion-cfdi-activada
description: Facturación CFDI 4.0 REACTIVADA y construida (feature/facturacion); reemplaza la pausa anterior
metadata: 
  node_type: memory
  type: project
  originSessionId: f7b4d484-5ad1-4f15-8dd7-73ad131fd21f
---

El 2026-06-07 el usuario REACTIVÓ la facturación (antes en pausa): la persona destino quiere facturar y ya tiene **RFC + CSD + cuenta de PAC**. Construí el módulo CFDI 4.0 en `feature/facturacion` (spec §3.5).

Qué quedó: módulo `src/lib/modules/facturacion/` (service/repository/schemas/types/events/catalogos/pdf + `pac/` adapter con cliente `facturama` real y `demo` simulado). Flujo: botón **Facturar** en el detalle de venta → `/facturacion/nueva?venta=<id>` → timbrar → detalle con descarga **PDF (jsPDF al vuelo) + XML**, cancelar con motivo SAT, listado en `/facturacion`. Instructivo: in-app `/facturacion/ayuda` + `docs/Guia-Facturacion.md`. Nav habilitado (quitado `disabled`). Migración `20260608005758_facturacion` (modelos `Factura`/`FacturaLinea`, enums `TipoCfdi`/`EstadoFactura`). Permisos: emitir=`facturacion:crear`, cancelar=`facturacion:autorizar` (añadido a SUPERVISOR en seed). Build ✓ y smoke test e2e en modo demo ✓ (emitir→XML→cancelar).

**Why:** Cambia el alcance fiscal del producto; el contador externo ya no es el único camino. Default `FACTURACION_MODO=demo` (timbres falsos, sin validez fiscal) para que pruebe sin credenciales; jsalazar conecta `FACTURAMA_USER/PASSWORD` (sandbox→prod) después.

**How to apply:** GOTCHA CRÍTICO — en este POS los precios son **IVA INCLUIDO** (`precioUnitario` es bruto). El CFDI exige neto: deriva de `l.subtotal` (base neta) y `l.ivaImporte`, NO uses `precioUnitario` como valor unitario (lo descubrió el smoke test: duplicaba IVA). Para cambios de PAC, todo está aislado en `pac/`. Limitaciones MVP (próximas fases): sin factura global de público en general, sin notas de crédito (Egreso), sin complemento de pago (PPD), sin envío por email (no hay SMTP), descuento global de venta no soportado (avisa). **PR #35 MERGEADO 2026-06-08** (ya en `main`). Relacionado: [[posvet-estado-y-mejoras]], [[entorno-local-jsalazar]].
