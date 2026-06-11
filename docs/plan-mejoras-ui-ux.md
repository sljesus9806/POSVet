# Plan de mejoras UI/UX — Ligerito

> Objetivo: hacer las acciones de los usuarios más rápidas, fáciles y cómodas;
> mejorar los reportes; y agregar lo que otros POS tienen y a este le falta.
> Workflow: **un PR a la vez** por pieza, rama `feature/<pieza>`, el usuario mergea.
> Creado 2026-06-10. Arranque elegido: **Fase A**.

## Diagnóstico (estado a 2026-06-10)

**Fuerte:** POS con atajos F2–F9, escaneo con auto-agregado, autocompletar en vivo,
pago mixto (efectivo/tarjeta/crédito), recibo PDF. Arquitectura modular limpia. 9
reportes con PDF+CSV. `recharts` para gráficas.

**Huecos:**
- POS: sin venta en espera, sin botones de denominación, sin descuento %, sin
  navegación de carrito por teclado, sin reimpresión rápida ni consulta de precio.
  El modal de cobro es un `div` casero (no accesible, sin Enter para cobrar).
- UI base: faltan primitivas (`Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`,
  `Skeleton`, `Command`); `next-themes` instalado pero sin modo oscuro; los listados
  no paginan.
- Reportes: falta utilidad/margen, tendencia temporal, comparativos, ventas por
  categoría, export nativo `.xlsx`.
- Faltantes "de otros POS": devoluciones parciales, importación de catálogo desde
  Excel, etiquetas de código de barras, ticket por WhatsApp/email, command palette
  (Ctrl+K), recuperación de contraseña.

---

## Fase A — "El cajero vuela" (POS, alto impacto / bajo riesgo)

| # | Mejora | Estado |
|---|--------|--------|
| A1 | **Cobro relámpago**: botones de denominación ($50/100/200/500/1000), "Exacto", "completar con tarjeta", **Enter = cobrar**, cambio en grande, faltante visible | 🚧 en curso (`feature/pos-cobro-rapido`) |
| A2 | **Venta en espera** (hold/recall) multi-ticket | pendiente |
| A3 | **Descuento en %** (línea y global) + navegar carrito con flechas, cantidad con `+/−`, quitar con `Supr` | pendiente |
| A4 | **Reimprimir último ticket** + **consulta de precio** (F6) sin agregar | pendiente |

## Fase B — Fundaciones de UI (desbloquea lo demás)

| # | Mejora | Estado |
|---|--------|--------|
| B1 | Primitivas shadcn (`Dialog` accesible, `DropdownMenu`, `Tabs`, `Tooltip`, `Skeleton`, `Command`) + **modo oscuro** | pendiente |
| B2 | **Tabla de datos reutilizable**: paginación + orden + búsqueda + estados carga/vacío (productos, clientes, proveedores, historial) | pendiente |

## Fase C — Reportes que venden

| # | Mejora | Estado |
|---|--------|--------|
| C1 | **Utilidad/margen** por producto y por venta (usa `ultimoCosto`/`costoPromedio`) | pendiente |
| C2 | **Tendencia** (día/semana/mes) + comparativo mes vs mes + ventas por categoría + top por utilidad; selector de rango en dashboard | pendiente |
| C3 | **Export nativo .xlsx** (SheetJS) + reporte de **IVA** + reporte de cancelaciones/devoluciones | pendiente |

## Fase D — Lo que otros POS tienen y a este le falta (por demanda)

| # | Mejora | Estado |
|---|--------|--------|
| D1 | Importación masiva de catálogo desde Excel/CSV | pendiente |
| D2 | Devoluciones/reembolsos parciales (hoy solo cancelación total) | pendiente |
| D3 | Command palette (Ctrl+K): saltar a módulos, buscar producto/cliente/folio | pendiente |
| D4 | Etiquetas de código de barras | pendiente |
| D5 | Ticket por WhatsApp/email (requiere SMTP/API) | pendiente |
| D6 | Recuperación de contraseña por email (requiere SMTP) | pendiente |
| D7 | Cajón de dinero / "sin venta" / impresión térmica directa | pendiente |
