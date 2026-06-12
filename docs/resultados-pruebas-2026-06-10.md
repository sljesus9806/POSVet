# Resultados de pruebas funcionales — Ligerito

> Ejecutado: 2026-06-10T22:17:02.825Z
> Capa A (integración, servicios vía index.ts). Guion: docs/plan-pruebas-funcionales.md

## Resumen

- **Casos:** 210
- **✅ PASA:** 210
- **❌ FALLA:** 0
- **🐛 Bugs documentados:** 0

## Detalle por módulo

### CFG

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| CFG-01 | obtenerEmpresaPrincipal devuelve la empresa del seed | ✅ | Mi Negocio Demo SA de CV |
| CFG-02 | actualizarEmpresa persiste + escribe AuditLog | ✅ | razón social actualizada |
| CFG-02 | actualizarEmpresa persiste + escribe AuditLog | ✅ | CP actualizado |
| CFG-02 | actualizarEmpresa persiste + escribe AuditLog | ✅ | persistido en BD |
| CFG-02 | actualizarEmpresa persiste + escribe AuditLog | ✅ | AuditLog empresa.editar presente |
| CFG-03 | listarUbicaciones devuelve Tienda + Bodega | ✅ | Tienda, Bodega |
| CFG-04 | crearUbicacion Sucursal Centro (SUCURSAL) creada y activa | ✅ | cmq8mpfmr0002wok0xnqwka2m |
| CFG-05 | actualizarUbicacion renombra y desactiva + audit | ✅ | renombrada |
| CFG-05 | actualizarUbicacion renombra y desactiva + audit | ✅ | desactivada |
| CFG-05 | actualizarUbicacion renombra y desactiva + audit | ✅ | AuditLog ubicacion.editar presente |
| CFG-06 | crearUbicacion con payload inválido → ZodError | ✅ | validación de entrada |

### USR

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| USR-01 | listarRolesDisponibles=5 y listar incluye admin | ✅ | 5 roles del sistema |
| USR-01 | listarRolesDisponibles=5 y listar incluye admin | ✅ | admin presente |
| USR-02 | crear un usuario de cada rol (CAJERO/ALMACENISTA/SUPERVISOR/READONLY) | ✅ | CAJERO creado (cmq8mpftv0007wok00e66ex2y) |
| USR-02 | crear un usuario de cada rol (CAJERO/ALMACENISTA/SUPERVISOR/READONLY) | ✅ | ALMACENISTA creado (cmq8mpg0j000awok0yfopgkc9) |
| USR-02 | crear un usuario de cada rol (CAJERO/ALMACENISTA/SUPERVISOR/READONLY) | ✅ | SUPERVISOR creado (cmq8mpg79000dwok089z04toi) |
| USR-02 | crear un usuario de cada rol (CAJERO/ALMACENISTA/SUPERVISOR/READONLY) | ✅ | READONLY creado (cmq8mpgdv000gwok0wuattjup) |
| USR-03 | actualizar usuario: renombra, cambia roles y desactiva + audit | ✅ | renombrado |
| USR-03 | actualizar usuario: renombra, cambia roles y desactiva + audit | ✅ | desactivado |
| USR-03 | actualizar usuario: renombra, cambia roles y desactiva + audit | ✅ | roles cambiados |
| USR-03 | actualizar usuario: renombra, cambia roles y desactiva + audit | ✅ | AuditLog usuario.editar presente |
| USR-04 | cambiarPassword y autenticar con la nueva contraseña | ✅ | autenticación con nueva clave OK |
| USR-05 | autenticar OK con admin del seed | ✅ | admin autenticado con rol ADMIN |
| USR-06 | autenticar con password incorrecta → CredencialesInvalidasError + intentosFallidos++ | ✅ |  |
| USR-06 | autenticar con password incorrecta → CredencialesInvalidasError + intentosFallidos++ | ✅ | intentosFallidos=1 |
| USR-07 | 5 intentos fallidos → bloqueo 15 min (UsuarioBloqueadoError con pass correcta) | ✅ | bloqueadoHasta=2026-06-10T22:32:01.755Z |
| USR-07 | 5 intentos fallidos → bloqueo 15 min (UsuarioBloqueadoError con pass correcta) | ✅ | bloqueado aun con pass correcta |
| USR-08 | desbloquear permite autenticar de nuevo | ✅ | autenticación tras desbloqueo OK |
| USR-09 | crear con email duplicado → EmailEnUsoError | ✅ |  |
| USR-10 | admin se auto-desactiva → AutoDesactivacionError | ✅ |  |

### PRD

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| PRD-01 | categoriasService.listar (seed); crear; actualizar | ✅ | seed tiene 6 categorías |
| PRD-01 | categoriasService.listar (seed); crear; actualizar | ✅ | categoría creada |
| PRD-01 | categoriasService.listar (seed); crear; actualizar | ✅ | categoría renombrada |
| PRD-02 | crear medicamento (IVA, receta, controlada, lab, vía) + precios PUBLICO/MAYOREO/DISTRIBUIDOR | ✅ | 3 listas de precio |
| PRD-02 | crear medicamento (IVA, receta, controlada, lab, vía) + precios PUBLICO/MAYOREO/DISTRIBUIDOR | ✅ | flags receta/controlada |
| PRD-03 | crear alimento, accesorio y servicio | ✅ | 3 productos creados |
| PRD-04 | crearLote: uno con caducidad lejana y otro próxima (para alertas) | ✅ | 2 lotes creados |
| PRD-05 | actualizar producto (precio y nombre) → persiste + audit | ✅ | nombre actualizado |
| PRD-05 | actualizar producto (precio y nombre) → persiste + audit | ✅ | precio PUBLICO actualizado |
| PRD-05 | actualizar producto (precio y nombre) → persiste + audit | ✅ | AuditLog producto.editar presente |
| PRD-06 | listar con filtros (texto/tipo) y obtener por id | ✅ | filtro por texto encuentra el medicamento |
| PRD-06 | listar con filtros (texto/tipo) y obtener por id | ✅ | filtro por tipo SERVICIO |
| PRD-06 | listar con filtros (texto/tipo) y obtener por id | ✅ | obtener por id |
| PRD-07 | SKU duplicado → SkuDuplicadoError; precio negativo → ZodError | ✅ |  |
| PRD-07 | SKU duplicado → SkuDuplicadoError; precio negativo → ZodError | ✅ |  |

### INV

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| INV-01 | registrarEntrada de stock inicial a Bodega → movimiento ENTRADA y stock correcto | ✅ | med bodega = 100 |
| INV-01 | registrarEntrada de stock inicial a Bodega → movimiento ENTRADA y stock correcto | ✅ | ali bodega = 50 |
| INV-01 | registrarEntrada de stock inicial a Bodega → movimiento ENTRADA y stock correcto | ✅ | movimiento ENTRADA/COMPRA registrado |
| INV-02 | listarStock por ubicación y stockDeProducto multi-ubicación | ✅ | med aparece en stock de bodega |
| INV-02 | listarStock por ubicación y stockDeProducto multi-ubicación | ✅ | stock total med = 100 (solo bodega) |
| INV-03 | definirStockMinimo: med min<stock (sin alerta), ali min>stock (con alerta) | ✅ | stockMinimo ali = 80 |
| INV-04 | ajustarStock MERMA(-) y CONTEO(±) → kardex + stockResultante coherente | ✅ | stock tras merma |
| INV-04 | ajustarStock MERMA(-) y CONTEO(±) → kardex + stockResultante coherente | ✅ | stockResultante del movimiento coherente |
| INV-04 | ajustarStock MERMA(-) y CONTEO(±) → kardex + stockResultante coherente | ✅ | stock tras conteo (+3) |
| INV-05 | crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA | ✅ | origen descontado |
| INV-05 | crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA | ✅ | destino sumado |
| INV-05 | crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA | ✅ | estado COMPLETADA |
| INV-05 | crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA | ✅ | 2 movimientos de transferencia |
| INV-05 | crearTransferencia Bodega→Tienda → descuenta origen, suma destino, 2 movimientos, COMPLETADA | ✅ | listarTransferencias incluye la nueva |
| INV-06 | alertasBajoStock incluye ali; alertasPorCaducar(30) incluye lote próximo | ✅ | bajo stock: ALI-QA-001 |
| INV-06 | alertasBajoStock incluye ali; alertasPorCaducar(30) incluye lote próximo | ✅ | lote próximo (~20d) aparece en 30d |
| INV-07 | listarMovimientos (kardex) traza las operaciones | ✅ | med tiene 5 movimientos |
| INV-08 | ajuste que deja stock negativo → StockInsuficienteError | ✅ |  |

### PRO

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| PRO-01 | crear proveedor con datos fiscales; listar; obtener | ✅ | proveedor creado (PRV-00001) |
| PRO-01 | crear proveedor con datos fiscales; listar; obtener | ✅ | aparece en listar |
| PRO-01 | crear proveedor con datos fiscales; listar; obtener | ✅ | obtener por id |
| PRO-02 | actualizar (condiciones de pago, contacto) → persiste + audit | ✅ | diasCredito actualizado |
| PRO-02 | actualizar (condiciones de pago, contacto) → persiste + audit | ✅ | contacto actualizado |
| PRO-02 | actualizar (condiciones de pago, contacto) → persiste + audit | ✅ | AuditLog proveedor.editar presente |
| PRO-03 | agregarLineaCatalogo (med, ali); actualizarLineaCatalogo; listarCatalogo | ✅ | costo de línea actualizado |
| PRO-03 | agregarLineaCatalogo (med, ali); actualizarLineaCatalogo; listarCatalogo | ✅ | 2 líneas en catálogo |
| PRO-04 | eliminarLineaCatalogo → ya no aparece | ✅ | línea eliminada no aparece |
| PRO-05 | sugerenciasDeProveedor propone productos del catálogo (vía comprasService) | ✅ | sugiere el medicamento del catálogo |

### CLI

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| CLI-01 | crear PUBLICO, MAYOREO y DISTRIBUIDOR (con crédito) | ✅ | DISTRIBUIDOR con línea 5000 |
| CLI-01 | crear PUBLICO, MAYOREO y DISTRIBUIDOR (con crédito) | ✅ | tipo de precio efectivo DISTRIBUIDOR |
| CLI-01 | crear PUBLICO, MAYOREO y DISTRIBUIDOR (con crédito) | ✅ | PUBLICO sin crédito |
| CLI-02 | crear con datos fiscales (RFC, régimen, uso CFDI, CP) | ✅ | RFC persistido |
| CLI-02 | crear con datos fiscales (RFC, régimen, uso CFDI, CP) | ✅ | usoCFDI persistido |
| CLI-03 | listar con filtro por tipo y obtener | ✅ | filtro tipo DISTRIBUIDOR (2) |
| CLI-03 | listar con filtro por tipo y obtener | ✅ | obtener por id |
| CLI-04 | actualizar y baja lógica (activo=false, no se borra) | ✅ | desactivado |
| CLI-04 | actualizar y baja lógica (activo=false, no se borra) | ✅ | sigue en BD pero inactivo |
| CLI-05 | crédito negativo y nombre inválido → ZodError | ✅ | lineaCredito negativa |
| CLI-05 | crédito negativo y nombre inválido → ZodError | ✅ | nombre demasiado corto |

### CMP

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| CMP-01 | crearOrden (borrador) con líneas → totales correctos | ✅ | subtotal = 10*100 + 5*50 |
| CMP-01 | crearOrden (borrador) con líneas → totales correctos | ✅ | iva = 16% del subtotal |
| CMP-01 | crearOrden (borrador) con líneas → totales correctos | ✅ | total = subtotal + iva |
| CMP-01 | crearOrden (borrador) con líneas → totales correctos | ✅ | estado BORRADOR |
| CMP-02 | enviarOrden BORRADOR→ENVIADA | ✅ | estado ENVIADA |
| CMP-03 | registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL | ✅ | stock bodega +6 |
| CMP-03 | registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL | ✅ | costoPromedio = 100 (stock previo 0) |
| CMP-03 | registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL | ✅ | ultimoCosto = 100 |
| CMP-03 | registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL | ✅ | estado RECIBIDA_PARCIAL |
| CMP-03 | registrarRecepcion parcial → stock Bodega, costoPromedio, RECIBIDA_PARCIAL | ✅ | kardex de recepción presente |
| CMP-04 | registrarRecepcion del resto → RECIBIDA_TOTAL + costo promedio ponderado | ✅ | estado RECIBIDA_TOTAL |
| CMP-04 | registrarRecepcion del resto → RECIBIDA_TOTAL + costo promedio ponderado | ✅ | costo promedio ponderado = 120 |
| CMP-05 | listarOrdenes / obtenerOrden / listarRecepciones / obtenerRecepcion | ✅ | listarOrdenes incluye la OC |
| CMP-05 | listarOrdenes / obtenerOrden / listarRecepciones / obtenerRecepcion | ✅ | 2 recepciones |
| CMP-05 | listarOrdenes / obtenerOrden / listarRecepciones / obtenerRecepcion | ✅ | detalle de recepción con líneas |
| CMP-06 | cancelarOrden sobre OC en borrador → CANCELADA | ✅ | estado CANCELADA |
| CMP-07 | recepción > cantidad pedida y cancelar OC recibida → errores controlados | ✅ | recibir más de lo pedido |
| CMP-07 | recepción > cantidad pedida y cancelar OC recibida → errores controlados | ✅ | cancelar OC ya recibida |

### VEN

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| VEN-01 | abrirCaja en Tienda → ABIERTA; cajaAbiertaDeUsuario la encuentra | ✅ | caja abierta |
| VEN-01 | abrirCaja en Tienda → ABIERTA; cajaAbiertaDeUsuario la encuentra | ✅ | cajaAbiertaDeUsuario la encuentra |
| VEN-02 | abrir con caja ya abierta → CajaYaAbiertaError; vender sin caja → CajaNoAbiertaError | ✅ |  |
| VEN-02 | abrir con caja ya abierta → CajaYaAbiertaError; vender sin caja → CajaNoAbiertaError | ✅ |  |
| VEN-03 | buscarProductosVendibles por nombre, SKU y código de barras | ✅ | por nombre |
| VEN-03 | buscarProductosVendibles por nombre, SKU y código de barras | ✅ | por SKU |
| VEN-03 | buscarProductosVendibles por nombre, SKU y código de barras | ✅ | por código de barras |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | total = 150*2 |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | subtotal sin IVA |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | IVA desglosado |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | cambio = 400-300 |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | integridad subtotal+iva-descGlobal=total |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | stock descontado |
| VEN-04 | crearVenta efectivo 1 producto → stock-, IVA desglosado, total y cambio correctos | ✅ | kardex SALIDA por venta |
| VEN-05 | multi-línea + descuento por línea + descuento global → totales y r2 | ✅ | descuento de líneas = 10 |
| VEN-05 | multi-línea + descuento por línea + descuento global → totales y r2 | ✅ | descuento global = 30 |
| VEN-05 | multi-línea + descuento por línea + descuento global → totales y r2 | ✅ | total = (140+190) - 30 |
| VEN-05 | multi-línea + descuento por línea + descuento global → totales y r2 | ✅ | integridad de dinero |
| VEN-06 | pago mixto (efectivo + tarjeta) → venta_pagos cuadra con total | ✅ | total collar = 95 |
| VEN-06 | pago mixto (efectivo + tarjeta) → venta_pagos cuadra con total | ✅ | 2 pagos |
| VEN-06 | pago mixto (efectivo + tarjeta) → venta_pagos cuadra con total | ✅ | Σ pagos = total |
| VEN-07 | crearVenta a crédito → saldoCredito venta + saldoActual cliente incrementados | ✅ | precio DISTRIBUIDOR de iver = 155 |
| VEN-07 | crearVenta a crédito → saldoCredito venta + saldoActual cliente incrementados | ✅ | saldoCredito de la venta = 155 |
| VEN-07 | crearVenta a crédito → saldoCredito venta + saldoActual cliente incrementados | ✅ | montoCredito de la venta = 155 |
| VEN-07 | crearVenta a crédito → saldoCredito venta + saldoActual cliente incrementados | ✅ | saldoActual cliente +155 |
| VEN-08 | precio por tipo de cliente (MAYOREO) aplica la lista correcta | ✅ | tipoPrecio MAYOREO |
| VEN-08 | precio por tipo de cliente (MAYOREO) aplica la lista correcta | ✅ | precio MAYOREO del producto = 820 |
| VEN-09 | pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio | ✅ | pago insuficiente |
| VEN-09 | pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio | ✅ | cambio con tarjeta |
| VEN-09 | pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio | ✅ | stock insuficiente |
| VEN-09 | pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio | ✅ | crédito 155 excede línea 100 |
| VEN-09 | pago insuficiente / cambio no-efectivo / stock insuficiente / crédito excede / sin precio | ✅ | producto sin precio para el tipo |
| VEN-10 | cancelarVenta restituye stock y revierte crédito; repetir → VentaYaCanceladaError | ✅ | stock restituido (+2) |
| VEN-10 | cancelarVenta restituye stock y revierte crédito; repetir → VentaYaCanceladaError | ✅ | kardex ENTRADA por cancelación |
| VEN-10 | cancelarVenta restituye stock y revierte crédito; repetir → VentaYaCanceladaError | ✅ |  |
| VEN-10 | cancelarVenta restituye stock y revierte crédito; repetir → VentaYaCanceladaError | ✅ | saldoActual del cliente chico revertido a 0 |
| VEN-12 | listarVentas y obtenerVenta (detalle: líneas + pagos) | ✅ | listarVentas devuelve 6 |
| VEN-12 | listarVentas y obtenerVenta (detalle: líneas + pagos) | ✅ | detalle con líneas y pagos |
| VEN-11 | cerrarCaja con conteo de efectivo → esperado vs contado, diferencia, CERRADA | ✅ | caja cerrada |
| VEN-11 | cerrarCaja con conteo de efectivo → esperado vs contado, diferencia, CERRADA | ✅ | monto esperado calculado |
| VEN-11 | cerrarCaja con conteo de efectivo → esperado vs contado, diferencia, CERRADA | ✅ | diferencia 0 (conté lo esperado) |

### COB

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| COB-01 | resumen → saldos por cobrar tras la venta a crédito | ✅ | totalPorCobrar=155 |
| COB-02 | listarVentasCredito y estadoCuenta del cliente | ✅ | venta a crédito listada |
| COB-02 | listarVentasCredito y estadoCuenta del cliente | ✅ | saldoActual = 155 |
| COB-03 | registrarAbono parcial → reduce saldoActual cliente y saldoCredito venta | ✅ | saldoCredito venta = 100 |
| COB-03 | registrarAbono parcial → reduce saldoActual cliente y saldoCredito venta | ✅ | saldoActual cliente = 100 |
| COB-04 | registrarAbono que liquida → saldo a 0 | ✅ | saldoCredito venta = 0 |
| COB-04 | registrarAbono que liquida → saldo a 0 | ✅ | Σ aplicaciones = monto abono |
| COB-05 | listarAbonos y obtenerAbono (con aplicaciones) | ✅ | 2 abonos |
| COB-05 | listarAbonos y obtenerAbono (con aplicaciones) | ✅ | detalle con aplicaciones |
| COB-06 | cancelarAbono → revierte saldos al estado previo | ✅ | saldoCredito vuelve a 100 |
| COB-06 | cancelarAbono → revierte saldos al estado previo | ✅ | saldoActual vuelve a 100 |
| COB-07 | abono > saldo y abono con venta de otro cliente → errores controlados | ✅ | abono mayor al saldo |
| COB-07 | abono > saldo y abono con venta de otro cliente → errores controlados | ✅ | venta de otro cliente |

### CXP

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| CXP-01 | registrarFactura → incrementa saldoActual del proveedor | ✅ | saldo inicial = total |
| CXP-01 | registrarFactura → incrementa saldoActual del proveedor | ✅ | saldoActual proveedor +5000 |
| CXP-02 | listarFacturas, obtenerFactura, resumen, estadoCuenta | ✅ | factura listada |
| CXP-02 | listarFacturas, obtenerFactura, resumen, estadoCuenta | ✅ | totalPorPagar=5000 |
| CXP-02 | listarFacturas, obtenerFactura, resumen, estadoCuenta | ✅ | estadoCuenta refleja saldo |
| CXP-03 | registrarPago parcial → reduce saldo, estado PAGADA_PARCIAL | ✅ | saldo factura = 3000 |
| CXP-03 | registrarPago parcial → reduce saldo, estado PAGADA_PARCIAL | ✅ | estado PAGADA_PARCIAL |
| CXP-04 | registrarPago que liquida → factura PAGADA | ✅ | saldo factura = 0 |
| CXP-04 | registrarPago que liquida → factura PAGADA | ✅ | estado PAGADA |
| CXP-05 | cancelarPago y cancelarFactura → reversiones de saldo | ✅ | saldo factura vuelve a 3000 |
| CXP-05 | cancelarPago y cancelarFactura → reversiones de saldo | ✅ | estado vuelve a PAGADA_PARCIAL |
| CXP-05 | cancelarPago y cancelarFactura → reversiones de saldo | ✅ | factura cancelada |
| CXP-05 | cancelarPago y cancelarFactura → reversiones de saldo | ✅ | saldo proveedor neto sin cambio (factura cancelada se anuló) |
| CXP-06 | pago > saldo y cancelar factura con pagos → errores controlados | ✅ | pago mayor al saldo |
| CXP-06 | pago > saldo y cancelar factura con pagos → errores controlados | ✅ | cancelar factura con pago activo |

### REP

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| REP-01 | ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD) | ✅ | totalVendido = Σ completadas (1370) |
| REP-01 | ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD) | ✅ | numTickets = #completadas (4) |
| REP-01 | ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD) | ✅ | totalCancelado = Σ canceladas (395) — no contamina ventas |
| REP-01 | ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD) | ✅ | desglose por forma de pago |
| REP-01 | ventasDelDia: total/tickets/ticket promedio/por forma de pago (cross-check exacto vs BD) | ✅ | ticket promedio coherente |
| REP-02 | productosVendidos: ranking coincide con lo vendido | ✅ | 4 productos, monto=1400 |
| REP-03 | ventasPorUsuario: desglose por cajero | ✅ | 1 usuarios, total=1370 |
| REP-04 | inventarioActual: stock valorizado + margen potencial | ✅ | costo=49505, venta=92051.5 |
| REP-04 | inventarioActual: stock valorizado + margen potencial | ✅ | margen = venta - costo |
| REP-05 | productosPorCaducar: incluye el lote próximo (~20d) | ✅ | 1 lotes por caducar |
| REP-06 | antiguedadSaldosCxC: saldos de clientes (post cobranza) | ✅ | totalCxC=100 |
| REP-07 | antiguedadSaldosCxP: saldos de proveedores (post CxP) | ✅ | totalCxP=3000 |
| REP-08 | productosSinMovimiento: incluye un producto sin ventas | ✅ | 5 productos sin movimiento |
| REP-09 | generarReportePDF produce un buffer válido para cada reporte | ✅ | 8 PDFs generados (ventas-dia:6003B, productos-vendidos:7386B, ventas-por-usuario:4954B, inventario-actual:14915B, por-caducar:5432B, antiguedad-cxc:4949B, antiguedad-cxp:4963B, sin-movimiento:6776B) |

### DSH

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| DSH-01 | ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe | ✅ | ventas hoy=1370, franjas=1 |
| DSH-01 | ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe | ✅ | por cobrar=100 |
| DSH-01 | ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe | ✅ | alerta de bajo stock (ali) presente |
| DSH-01 | ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe | ✅ | alerta por caducar (lote próximo) presente |
| DSH-01 | ventas de hoy>0, por cobrar>0, alertas reflejan INV-03/PRD-04, caja del día existe | ✅ | caja(s) del día visibles (1) |
| DSH-02 | RBAC visual: CAJERO no ve 'Por cobrar'(cuentas/reportes) ; READONLY no muta; ALMACENISTA ve inventario | ✅ | CAJERO sin acceso a reportes/CxP |
| DSH-02 | RBAC visual: CAJERO no ve 'Por cobrar'(cuentas/reportes) ; READONLY no muta; ALMACENISTA ve inventario | ✅ | READONLY no muta nada |
| DSH-02 | RBAC visual: CAJERO no ve 'Por cobrar'(cuentas/reportes) ; READONLY no muta; ALMACENISTA ve inventario | ✅ | ALMACENISTA ve y ajusta inventario |

### RBAC

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| RBAC-01 | tienePermiso por rol respeta la matriz del seed | ✅ | CAJERO: vende, no crea usuarios |
| RBAC-01 | tienePermiso por rol respeta la matriz del seed | ✅ | ALMACENISTA: ajusta inventario, no vende |
| RBAC-01 | tienePermiso por rol respeta la matriz del seed | ✅ | SUPERVISOR: cobranza sí, usuarios no |
| RBAC-01 | tienePermiso por rol respeta la matriz del seed | ✅ | READONLY: solo lectura |
| RBAC-01 | tienePermiso por rol respeta la matriz del seed | ✅ | ADMIN: todo (bypass) |

### AUD

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| AUD-01 | AuditLog registró acciones críticas (cancelaciones, ajustes, cambios) | ✅ | todas las acciones críticas auditadas |
| AUD-01 | AuditLog registró acciones críticas (cancelaciones, ajustes, cambios) | ✅ | cancelación registra usuario y antes/después |

### EVT

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| EVT-01 | event-bus emite sin romper flujos (sin suscriptores registrados) | ✅ | emitir un evento sin handlers es no-op seguro |

### DIN

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| DIN-01 | integridad de dinero: subtotal+iva-descGlobal=total; Σpagos=total; Σaplic=monto | ✅ | venta: subtotal+iva-descGlobal = total |
| DIN-01 | integridad de dinero: subtotal+iva-descGlobal=total; Σpagos=total; Σaplic=monto | ✅ | venta: Σ pagos = totalPagado |
| DIN-01 | integridad de dinero: subtotal+iva-descGlobal=total; Σpagos=total; Σaplic=monto | ✅ | abono: Σ aplicaciones = monto |
| DIN-01 | integridad de dinero: subtotal+iva-descGlobal=total; Σpagos=total; Σaplic=monto | ✅ | pago CxP: Σ aplicaciones = monto |

### KDX

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| KDX-01 | kardex coherente: stockResultante = acumulado de movimientos (med/bodega) | ✅ | kardex coherente; stock final=83 |

### CON

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| CON-01 | concurrencia: 2 ventas simultáneas del mismo producto con stock para una | ✅ | exitosas=1, stock final=0 |
| CON-02 | concurrencia: N ventas simultáneas con stock suficiente → todas exitosas, folios únicos | ✅ | las 8 ventas concurrentes tuvieron éxito (exitosas=8) |
| CON-02 | concurrencia: N ventas simultáneas con stock suficiente → todas exitosas, folios únicos | ✅ | folios únicos sin colisión (8 folios, 8 distintos) |
| CON-02 | concurrencia: N ventas simultáneas con stock suficiente → todas exitosas, folios únicos | ✅ | stock descontado exacto sin sobreventa (final=0) |

## Bugs encontrados

_Ninguno._