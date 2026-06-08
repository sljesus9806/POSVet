# Guía de facturación (CFDI 4.0)

Esta guía explica cómo emitir facturas electrónicas (CFDI 4.0) desde Ligerito.
Tiene dos partes:

- **Parte A — Para quien factura** (uso diario, paso a paso).
- **Parte B — Para quien instala el sistema** (configuración inicial, una sola vez).

> El sistema arranca en **modo de pruebas** (`demo`): puedes practicar todo el
> flujo, pero esas facturas **no tienen validez fiscal**. Para emitir facturas
> reales hay que conectar el PAC (ver Parte B).

---

## Parte A — Cómo hacer una factura (uso diario)

También tienes esta guía dentro del sistema, en **Facturación → ¿Cómo facturo?**

### 1. Haz la venta como siempre
La factura se genera **a partir de una venta ya cobrada**, no durante el cobro.
Si sabes que el cliente pedirá factura, conviene registrarlo como **cliente** con
sus datos fiscales: así se llenan solos al facturar.

### 2. Abre la venta y presiona “Facturar”
Ve a **Ventas → Historial**, busca la venta y entra a su detalle. Arriba a la
derecha está el botón **Facturar**.
- Si la venta ya tiene factura, en su lugar verás **“Ver factura”**.

### 3. Captura los datos fiscales del cliente
El cliente entrega su **Constancia de Situación Fiscal** (documento del SAT). De
ahí se copian:

| Dato | Ejemplo |
|------|---------|
| RFC | `XAXX010101000` |
| Nombre / Razón social (sin “S.A. de C.V.”) | `JUAN PÉREZ LÓPEZ` |
| Código postal | `01000` |
| Régimen fiscal | `626 — RESICO` (se elige de la lista) |
| Uso del CFDI | `G03 — Gastos en general` |

Si el cliente ya estaba registrado con estos datos, aparecerán prellenados;
solo verifícalos.

### 4. Presiona “Timbrar factura”
El sistema toma automáticamente los productos y el total de la venta, los manda
al SAT y regresa la factura sellada. Si algún dato está mal, lo indica en
pantalla para corregir e intentar de nuevo.

### 5. Entrega el PDF y el XML
Al terminar verás la factura con botones para:
- **PDF (imprimir)** — abre el PDF para imprimirlo o guardarlo.
- **Descargar PDF** — baja el archivo PDF.
- **Descargar XML** — baja el archivo XML (el documento oficial del SAT).

Al cliente se le entregan **los dos archivos** (PDF + XML).

### 6. ¿Te equivocaste? Cancela la factura
Entra a la factura desde **Facturación**, presiona **Cancelar factura** y elige
el motivo. Después puedes volver a facturar la venta.
- La cancelación la realiza un **supervisor** o **administrador**.
- Motivo `01` (sustitución) pide el UUID de la factura nueva que la reemplaza.

---

## Parte B — Configuración inicial (para quien instala)

### 1. Datos fiscales del negocio (emisor)
En **Configuración**, completa los datos de la empresa:
- **RFC**, **Razón social**, **Régimen fiscal** y **Código postal**.

Sin estos datos, el sistema no deja timbrar (lo avisa con un mensaje claro).

### 2. Requisitos del cliente que facturará
Para emitir CFDI reales, el negocio necesita (trámites ante el SAT / el PAC):
1. Estar dado de alta en el **SAT** con su **RFC**.
2. Tener sus **CSD** (Certificado de Sello Digital) — son las llaves para firmar.
3. Una cuenta con un **PAC**. Aquí usamos **Facturama**
   (https://facturama.mx). El **CSD se carga en la cuenta de Facturama**.

### 3. Conectar Facturama (pasar de pruebas a real)
La configuración vive en variables de entorno (archivo `.env`). Cámbialas y
reinicia el sistema:

```bash
# Pasar de "demo" a timbrado real
FACTURACION_MODO="facturama"

# Serie de folios (correlativo por serie)
FACTURACION_SERIE="A"

# Claves SAT por defecto de los conceptos.
#   01010101 = "No existe en el catálogo"  ·  H87 = "Pieza"
# Ajusta la clave de producto/servicio al giro real del negocio.
FACTURACION_CLAVE_PROD_SERV="01010101"
FACTURACION_CLAVE_UNIDAD="H87"

# Credenciales de la API de Facturama (NO las del portal web).
#   Sandbox (pruebas):  https://apisandbox.facturama.mx
#   Producción (real):  https://api.facturama.mx
FACTURAMA_API_URL="https://apisandbox.facturama.mx"
FACTURAMA_USER="usuario_api"
FACTURAMA_PASSWORD="contraseña_api"
```

**Recomendado:** prueba primero contra el **sandbox** de Facturama (gratuito),
verifica que una factura timbra y se descarga, y recién entonces cambia
`FACTURAMA_API_URL` a producción.

### 4. Notas técnicas
- El cliente de Facturama usa la **API multiemisor** (rutas `/3/cfdis`). Si la
  cuenta es del tipo **API Lite** (un solo emisor), revisa rutas/campos en la
  documentación de Facturama; el adaptador está aislado en
  `src/lib/modules/facturacion/pac/facturama.ts`.
- El **XML** timbrado se guarda en la base de datos (es el documento fiscal);
  el **PDF** se genera al vuelo a partir de los datos.
- Cada factura guarda un **snapshot** del emisor y del receptor: editar después
  la empresa o el cliente no altera facturas ya emitidas.

### 5. Limitaciones del MVP (próximas fases)
- **Factura global** de público en general (agrupar tickets sin RFC): pendiente.
- **Notas de crédito** (Egreso) y **complementos de pago** (PPD): pendientes.
- **Descuento global** en la venta: por ahora no se factura (sí los descuentos
  por producto). La emisión lo avisa con un mensaje.
- **Envío por correo** del CFDI: pendiente (por ahora se descarga/imprime).
- **Productos con IVA 0% / exentos**: el concepto se marca según su IVA; revisa
  los casos especiales contra tu PAC en sandbox.
