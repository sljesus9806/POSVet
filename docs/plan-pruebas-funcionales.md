# Plan de pruebas funcionales — POSVet

> **Propósito:** verificación funcional completa de todo el POS, ejecutada por Claude.
> Este documento es el guion; la ejecución produce `docs/resultados-pruebas-<fecha>.md`.
> Creado 2026-05-30. Estado: **pendiente de ejecución** (esperando sesión sin restricciones).

## 1. Objetivo y alcance

Probar **todas las funciones** de los 12 módulos: configuración, usuarios/RBAC, productos,
inventario, proveedores, clientes, compras, ventas/POS, cobranza, cuentas por pagar, reportes y
dashboard. Incluye caminos felices, **caminos de error** (validaciones Zod, RBAC, reglas de
negocio) e **integridad de datos** (dinero, kardex, saldos, auditoría). Fuera de alcance:
facturación CFDI (pausada, ver memoria `facturacion-en-pausa`).

## 2. Estrategia (3 capas)

| Capa | Qué | Cómo | Cobertura |
|------|-----|------|-----------|
| **A. Integración** | Lógica de negocio de cada servicio end-to-end | Scripts `tsx` en `scripts/qa/` que importan los servicios vía su `index.ts` y corren flujos con `assert` | ~90% — núcleo |
| **B. Smoke web** | Que cada ruta renderice sin error 500 | Script que hace login (NextAuth credentials + CSRF) y `GET` a todas las páginas; status < 400 | Capa SSR/UI |
| **C. E2E UI (opcional)** | Flujo POS interactivo (atajos F2–F9, carrito, cobro) | Playwright headless contra `npm run dev` | Críticos UI |

La capa A es obligatoria y determinista. B confirma el cableado UI→action→servicio. C es el extra
de mayor valor si hay tiempo (el POS es lo más interactivo).

## 3. Preparación del entorno

```bash
# BD de PRUEBA dedicada para no destruir los datos de dev del usuario:
#   en .env.test:  DATABASE_URL=...://posvet:posvet_dev@localhost:5432/posvet_test?schema=public
# (o aceptar reset de la BD dev — es dev con datos demo)
npm run db:up                      # Postgres (ya configurado, contenedor posvet-db-dev)
npm run db:reset && npm run db:seed  # estado limpio determinista
```

El seed deja: empresa, ubicaciones **Tienda** y **Bodega**, roles (ADMIN/SUPERVISOR/CAJERO/
ALMACENISTA/READONLY), admin `admin@posvet.local`, categorías y productos demo. Las pruebas que
necesiten un `usuarioId` para `ctx` usan el id del admin (y de los usuarios que cree el caso 2).

## 4. Orden de ejecución (respeta dependencias)

Configuración → Usuarios → Productos/Categorías → Inventario → Proveedores → Clientes →
Compras → **Ventas/POS** → Cobranza → Cuentas por pagar → Reportes → Dashboard → Transversales.

## 5. Casos de prueba por módulo

Notación: cada caso tiene **ID**, función (servicio.método), y resultado esperado. Los `✗`
marcan caminos de error que **deben** fallar de forma controlada.

### 5.1 Configuración
- **CFG-01** `obtenerEmpresaPrincipal` → devuelve la empresa del seed.
- **CFG-02** `actualizarEmpresa` (RFC, razón social, CP, dirección) → persiste + escribe AuditLog.
- **CFG-03** `listarUbicaciones` → Tienda + Bodega.
- **CFG-04** `crearUbicacion` ("Sucursal Centro", tipo SUCURSAL) → creada y activa.
- **CFG-05** `actualizarUbicacion` (renombrar y desactivar) → refleja cambios + audit.
- **CFG-06 ✗** crear ubicación con payload inválido → `ZodError`.

### 5.2 Usuarios y RBAC
- **USR-01** `listarRolesDisponibles` → 5 roles. `listar` → al menos admin.
- **USR-02** `crear` un usuario de cada rol: CAJERO, ALMACENISTA, SUPERVISOR, READONLY (se reutilizan en RBAC).
- **USR-03** `actualizar` (cambiar roles, desactivar) → refleja + audit.
- **USR-04** `cambiarPassword` → nuevo hash; `autenticar` con la nueva pasa.
- **USR-05** `autenticar` OK con admin del seed.
- **USR-06 ✗** `autenticar` con password mala → falla e incrementa `intentosFallidos` (evento login.fallido).
- **USR-07 ✗** 5 intentos fallidos → bloqueo 15 min; `autenticar` bloqueado aun con pass correcta.
- **USR-08** `desbloquear` → permite autenticar de nuevo.
- **USR-09 ✗** `crear` con email duplicado → `EmailEnUsoError`.
- **USR-10 ✗** admin se auto-desactiva → `AutoDesactivacionError`.

### 5.3 Productos y categorías
- **PRD-01** `categoriasService.listar` (seed); `crear` ("Antiparasitarios"); `actualizar`.
- **PRD-02** `crear` medicamento (con IVA, requiere receta, sustancia controlada, laboratorio, vía) + precios PUBLICO/MAYOREO/VETERINARIO.
- **PRD-03** `crear` alimento, accesorio y servicio (servicio = sin inventario).
- **PRD-04** `crearLote` para el medicamento con caducidad futura y otra próxima (para alertas).
- **PRD-05** `actualizar` (cambiar precios, nombre) → persiste + audit.
- **PRD-06** `listar` con filtros (texto, categoría, tipo); `obtener` por id.
- **PRD-07 ✗** SKU o código de barras duplicado → error; precio negativo → `ZodError`.

### 5.4 Inventario
- **INV-01** `registrarEntrada` de stock inicial a **Bodega** para varios productos → crea InventarioMovimiento (ENTRADA) y stock correcto.
- **INV-02** `listarStock` por ubicación; `stockDeProducto` resumen multi-ubicación.
- **INV-03** `definirStockMinimo` por debajo del stock de un producto y por **encima** de otro (para alerta).
- **INV-04** `ajustarStock` motivo MERMA (–) y CONTEO (±) con observación → kardex + stock; verifica `stockResultante`.
- **INV-05** `crearTransferencia` Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, estado COMPLETADA; `listarTransferencias`.
- **INV-06** `alertasBajoStock` → incluye el producto del INV-03; `alertasPorCaducar(30/60/90)` → lote próximo del PRD-04.
- **INV-07** `listarMovimientos` (kardex) → traza completa de INV-01..05.
- **INV-08 ✗** ajuste/transferencia que deja stock negativo → `StockInsuficienteError`.

### 5.5 Proveedores
- **PRO-01** `crear` proveedor con datos fiscales; `listar`, `obtener`.
- **PRO-02** `actualizar` (condiciones de pago, contacto) → persiste + audit.
- **PRO-03** `agregarLineaCatalogo` (producto + costo + código proveedor); `actualizarLineaCatalogo`; `listarCatalogo`.
- **PRO-04** `eliminarLineaCatalogo` → ya no aparece.
- **PRO-05** `sugerenciasDeProveedor` → propone productos del catálogo para OC.

### 5.6 Clientes
- **CLI-01** `crear` 4 tipos: PUBLICO, MAYOREO, VETERINARIO afiliado, GRANJA; uno **con línea de crédito** y plazo, otro sin.
- **CLI-02** `crear` con datos fiscales completos (RFC, régimen, uso CFDI, CP).
- **CLI-03** `listar` (filtros, paginación), `obtener`.
- **CLI-04** `actualizar` y **baja lógica** (activo=false) → no se borra, se desactiva.
- **CLI-05 ✗** validaciones (crédito negativo, campos requeridos) → `ZodError`.

### 5.7 Compras (OC + recepción)
- **CMP-01** `crearOrden` (borrador) con líneas (proveedor PRO-01 + productos + costos) → totales correctos.
- **CMP-02** `enviarOrden` → estado BORRADOR→ENVIADA.
- **CMP-03** `registrarRecepcion` **parcial** → suma stock Bodega (`aplicarEntradaPorCompra`), recalcula `ultimoCosto`/`costoPromedio`, estado RECIBIDA_PARCIAL, evento compra.recibida + kardex.
- **CMP-04** `registrarRecepcion` del resto → estado RECIBIDA_TOTAL.
- **CMP-05** `listarOrdenes`, `obtenerOrden`, `listarRecepciones`, `obtenerRecepcion`.
- **CMP-06** `cancelarOrden` sobre una OC en borrador → CANCELADA.
- **CMP-07 ✗** recepción > cantidad pedida; cancelar OC ya recibida → error controlado.
- **Verificar:** costo promedio ponderado correcto tras 2 recepciones a costos distintos.

### 5.8 Ventas / POS (núcleo)
- **VEN-01** `abrirCaja` (fondo inicial) en Tienda → estado ABIERTA; `cajaAbiertaDeUsuario` la encuentra.
- **VEN-02 ✗** `abrirCaja` con caja ya abierta → `CajaYaAbiertaError`; `crearVenta` sin caja → `CajaNoAbiertaError`.
- **VEN-03** `buscarProductosVendibles` por nombre, SKU y código de barras.
- **VEN-04** `crearVenta` efectivo, 1 producto → descuenta stock (kardex SALIDA), IVA desglosado, total y **cambio** correctos, evento venta.creada.
- **VEN-05** `crearVenta` multi-línea + descuento por línea + **descuento global** → totales y redondeo `r2` correctos.
- **VEN-06** `crearVenta` **pago mixto** (efectivo + tarjeta) → `venta_pagos` cuadra con total.
- **VEN-07** `crearVenta` **a crédito** (cliente CLI-01 con crédito) → `saldoCredito` venta + `saldoActual` cliente incrementados (decrement/increment atómico).
- **VEN-08** `crearVenta` con **precio por tipo** (cliente MAYOREO/VETERINARIO) → aplica lista correcta.
- **VEN-09 ✗** pago insuficiente → `PagoInsuficienteError`; cambio con forma no-efectivo → `CambioSoloEfectivoError`; stock insuficiente → `StockInsuficienteError`; crédito que excede línea → bloqueado; producto sin precio → `ProductoSinPrecioError`.
- **VEN-10** `cancelarVenta` con motivo → **restituye stock** (kardex ENTRADA), revierte `saldoCredito`/`saldoActual`, evento venta.cancelada; `VentaYaCanceladaError` si se repite.
- **VEN-11** `cerrarCaja` con conteo de efectivo → calcula esperado vs contado, **diferencia**; estado CERRADA; evento caja.cerrada.
- **VEN-12** `listarVentas`, `obtenerVenta` (detalle: líneas + pagos), datos del ticket.

### 5.9 Cobranza (crédito)
- **COB-01** `resumen` → saldos por cobrar tras VEN-07.
- **COB-02** `listarVentasCredito`; `estadoCuenta` del cliente a crédito.
- **COB-03** `registrarAbono` parcial → distribuye a la(s) venta(s), reduce `saldoActual` cliente y `saldoCredito` venta; con forma de pago.
- **COB-04** `registrarAbono` que **liquida** → saldo a 0, venta sin saldo.
- **COB-05** `listarAbonos`, `obtenerAbono` (con aplicaciones).
- **COB-06** `cancelarAbono` → revierte saldos a estado previo.
- **COB-07 ✗** abono > saldo; abono a cliente sin deuda → error controlado.
- **Verificar:** la suma de aplicaciones = monto del abono; saldos cuadran al centavo.

### 5.10 Cuentas por pagar
- **CXP-01** `registrarFactura` de proveedor (PRO-01) → incrementa `saldoActual` proveedor.
- **CXP-02** `listarFacturas`, `obtenerFactura`, `resumen`, `estadoCuenta`.
- **CXP-03** `registrarPago` parcial con distribución a factura(s) → reduce saldo; forma de pago; estado factura.
- **CXP-04** `registrarPago` que liquida → factura PAGADA, evento factura.pagada.
- **CXP-05** `cancelarFactura` y `cancelarPago` → reversiones correctas de saldo.
- **CXP-06 ✗** pago > saldo; cancelar factura ya pagada → error controlado.

### 5.11 Reportes (deben reflejar 5.7–5.10)
- **REP-01** `ventasDelDia` → total/tickets/ticket promedio/por hora/por forma de pago coinciden con VEN-04..08.
- **REP-02** `productosVendidos` → ranking coincide con lo vendido.
- **REP-03** `ventasPorUsuario` → desglose por cajero.
- **REP-04** `inventarioActual` → stock valorizado tras compras/ventas/ajustes; margen potencial.
- **REP-05** `productosPorCaducar` → lote próximo del PRD-04.
- **REP-06** `antiguedadSaldosCxC` → saldos clientes (post COB); buckets correctos.
- **REP-07** `antiguedadSaldosCxP` → saldos proveedores (post CXP).
- **REP-08** `productosSinMovimiento` → productos sin ventas.
- **REP-09** Exportación PDF (`generarReportePDF`) genera un buffer/archivo válido para cada reporte.

### 5.12 Dashboard (mejora nueva, PR #19)
- **DSH-01** Tras toda la operación: ventas de hoy > 0, gráfica por hora con datos, caja visible, por cobrar > 0, alertas de inventario reflejan INV-03/PRD-04.
- **DSH-02** RBAC visual: como CAJERO no aparece la tarjeta "Por cobrar"; como READONLY no aparece "Tu caja"; como ALMACENISTA aparecen alertas de inventario.

## 6. Pruebas transversales

- **RBAC-01** Con cada usuario de USR-02, invocar acciones fuera de su rol → denegadas por `hasPermission`/`requirePermission`. Ej.: CAJERO intenta `crearUsuario` → denegado; ALMACENISTA hace `ajustarStock` (OK) pero `crearVenta` según permisos; READONLY no muta nada.
- **AUD-01** `AuditLog` registró las acciones críticas: cancelaciones (venta, abono, pago), ajustes de inventario, cambios de empresa/usuario, cambios de precio. Verificar usuario, acción y antes/después.
- **EVT-01** Documentar que el event-bus emite pero no hay suscriptores (hallazgo conocido); las emisiones no rompen los flujos.
- **DIN-01 (integridad de dinero)** En cada venta/abono/pago: suma de líneas = subtotal; IVA = total−subtotal; `Σ pagos = total`; `Σ aplicaciones = monto`; saldos cuadran al centavo (sin deriva de redondeo).
- **KDX-01 (kardex)** Cada cambio de stock (entrada, salida por venta, ajuste, transferencia, recepción, cancelación) tiene su `InventarioMovimiento` con `stockResultante` coherente con el acumulado.
- **CON-01 (concurrencia — hallazgo abierto)** Lanzar 2 `crearVenta` simultáneas del mismo producto con stock justo para una → **confirmar/medir** la condición de carrera de stock (read-check-write sin lock bajo READ COMMITTED). Documentar si hay sobreventa. Ver memoria `posvet-estado-y-mejoras`.

## 7. Artefactos que produce la ejecución

```
scripts/qa/
  00-setup.ts        # reset + seed + handles a servicios, helpers de assert/log
  01-configuracion.ts ... 12-dashboard.ts   # un archivo por módulo (casos 5.x)
  20-transversales.ts                        # sección 6
  30-smoke-web.ts                            # capa B (login + GET a rutas)
  run-all.ts         # runner: corre en orden, acumula PASA/FALLA, exit code
  (opcional) e2e/pos.spec.ts                 # capa C Playwright
docs/resultados-pruebas-<fecha>.md           # reporte final
```

**Formato del reporte:** tabla por módulo `ID | Caso | Resultado (✅/❌) | Nota/bug`, resumen
de conteos, y sección "Bugs encontrados" con severidad y pasos de reproducción.

## 8. Cómo ejecutar (sesión sin restricciones)

1. `npm run db:up` (verificar Postgres) → `npm run db:reset && npm run db:seed`.
2. Escribir los scripts de `scripts/qa/` (capa A) siguiendo §5–6.
3. `tsx scripts/qa/run-all.ts` → ejecuta toda la suite de integración.
4. Capa B: `npm run dev` en background + `tsx scripts/qa/30-smoke-web.ts`.
5. (Opcional) Capa C: instalar Playwright + `pos.spec.ts`.
6. Redactar `docs/resultados-pruebas-<fecha>.md`; abrir issue/PR por cada bug (no auto-fix sin avisar).

## 9. Criterio de cierre

- Todos los casos `✗` fallan de forma **controlada** (excepción tipada, no crash).
- Todos los caminos felices pasan; los reportes/dashboard reflejan las operaciones.
- Cada bug queda documentado con severidad y reproducción. Los hallazgos de diseño abiertos
  (concurrencia de stock, event-bus sin suscriptores, falta de tests) se confirman y anotan,
  **sin** corregirlos en esta corrida salvo que el usuario lo pida.
