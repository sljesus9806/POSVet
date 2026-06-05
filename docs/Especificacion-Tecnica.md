# Ligerito — Especificación Técnica

**Sistema de Punto de Venta con Facturación y Cobranza**
Versión 1.0 — Diseño modular para tienda + bodega

---

## 1. Resumen ejecutivo

Sistema web modular para cualquier giro (abarrotes, farmacia, veterinaria, papelería…) con bodega anexa, diseñado para crecer sin reescribirse. El sistema debe permitir vender, controlar inventario en dos ubicaciones (tienda y bodega), gestionar clientes con crédito, emitir facturas CFDI 4.0 al SAT, y operarse por personal con conocimientos básicos en tecnología.

**Stack elegido:**
- Frontend: Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Next.js API Routes + Server Actions
- Base de datos: PostgreSQL 16 con Prisma ORM
- Facturación electrónica: Facturama API (PAC)
- Autenticación: NextAuth.js (Auth.js v5)
- Despliegue: Híbrido — servidor local (Docker) con réplica continua a la nube

**Principios de diseño:**
1. **Modularidad real** — cada módulo es independiente, comunicado por eventos y APIs internas
2. **Operación offline-tolerante** — si se cae internet, se puede seguir vendiendo
3. **UX para no-técnicos** — atajos de teclado, búsqueda rápida, mensajes claros en español
4. **Auditoría completa** — quién hizo qué y cuándo, sin excepciones

---

## 2. Arquitectura general

### 2.1 Diagrama de capas

```
┌─────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (Next.js Frontend)                │
│  - Páginas por módulo  - Componentes compartidos (UI)   │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  CAPA DE APLICACIÓN (Server Actions + API Routes)       │
│  - Lógica de negocio por módulo                         │
│  - Validación (Zod)  - Autorización (RBAC)              │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  CAPA DE DOMINIO (Servicios y eventos)                  │
│  - VentasService  - InventarioService  - FacturaService │
│  - Event Bus interno para comunicación entre módulos    │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│  CAPA DE DATOS (Prisma + PostgreSQL)                    │
│  - Repositorios  - Migraciones versionadas              │
└─────────────────────────────────────────────────────────┘
                          │
┌──────────────────────┐    ┌─────────────────────────────┐
│ INTEGRACIONES EXT.   │    │ DESPLIEGUE HÍBRIDO          │
│ - Facturama (CFDI)   │    │ - Local: Docker en tienda   │
│ - Stripe (futuro)    │    │ - Nube: Railway/Supabase    │
│ - WhatsApp (futuro)  │    │ - Sync continuo PostgreSQL  │
└──────────────────────┘    └─────────────────────────────┘
```

### 2.2 Estructura de carpetas (monorepo simple)

```
ligerito/
├── apps/
│   └── web/                          # Aplicación Next.js
│       ├── app/
│       │   ├── (auth)/               # Login, recuperar contraseña
│       │   ├── (dashboard)/          # Layout autenticado
│       │   │   ├── ventas/
│       │   │   ├── clientes/
│       │   │   ├── proveedores/
│       │   │   ├── productos/
│       │   │   ├── facturacion/
│       │   │   ├── reportes/
│       │   │   ├── configuracion/
│       │   │   └── usuarios/
│       │   └── api/                  # API Routes
│       ├── components/
│       │   ├── ui/                   # shadcn/ui base
│       │   └── shared/               # Componentes compartidos
│       └── lib/
│           ├── modules/              # ⭐ LÓGICA DE NEGOCIO MODULAR
│           │   ├── ventas/
│           │   ├── clientes/
│           │   ├── inventario/
│           │   ├── facturacion/
│           │   ├── proveedores/
│           │   ├── usuarios/
│           │   ├── reportes/
│           │   └── shared/
│           │       ├── event-bus.ts
│           │       ├── db.ts
│           │       └── auth.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker/
│   ├── docker-compose.yml            # Para servidor local
│   └── Dockerfile
└── docs/
```

### 2.3 Patrón de módulo (cada módulo sigue esta estructura)

```
lib/modules/<modulo>/
├── index.ts              # API pública del módulo (lo único que otros importan)
├── service.ts            # Lógica de negocio
├── repository.ts         # Acceso a datos
├── schemas.ts            # Validación Zod
├── types.ts              # Tipos TypeScript
├── events.ts             # Eventos que emite/escucha
└── __tests__/            # Pruebas unitarias
```

**Regla de oro:** Un módulo NUNCA importa archivos internos de otro módulo. Solo usa el `index.ts` público. Esto permite reescribir o reemplazar un módulo sin romper los demás.

---

## 3. Módulos del sistema

### 3.1 Módulo: Ventas (núcleo del POS)

**Responsabilidad:** Capturar ventas, procesar pagos, descontar inventario.

**Funcionalidad clave:**
- Pantalla de venta con búsqueda rápida de productos (por código de barras, nombre, SKU)
- Carrito con cantidades, descuentos por línea, descuento global
- Múltiples formas de pago en una misma venta (efectivo + tarjeta, por ejemplo)
- Venta a crédito (requiere cliente registrado con línea de crédito)
- Selección de ubicación de salida (tienda o bodega)
- Apertura/cierre de caja diario con conteo de efectivo
- Cancelación de venta con motivo y autorización del supervisor
- Impresión de ticket (térmica 58mm/80mm) o digital (PDF/WhatsApp)
- Modo offline: las ventas se guardan localmente y se sincronizan al recuperar conexión

**Atajos de teclado (críticos para velocidad):**
- `F2` — Buscar producto
- `F3` — Buscar cliente
- `F4` — Aplicar descuento
- `F8` — Cobrar
- `F9` — Cancelar línea
- `ESC` — Limpiar carrito

**Eventos que emite:**
- `venta.creada` → escuchan: Inventario (descontar), Reportes (registrar), Clientes (saldo)
- `venta.cancelada` → escuchan: Inventario (devolver), Facturación (cancelar CFDI si aplica)
- `caja.cerrada` → escuchan: Reportes (corte de caja)

**Tablas principales:**
- `ventas` — encabezado de venta
- `venta_lineas` — productos vendidos
- `venta_pagos` — desglose de formas de pago
- `cajas` — apertura/cierre por usuario y fecha

---

### 3.2 Módulo: Clientes (con cobranza)

**Responsabilidad:** Gestionar clientes, sus datos fiscales, su crédito y sus saldos.

**Funcionalidad clave:**
- Alta/edición/baja lógica de clientes (nunca se borra, solo se desactiva)
- Datos fiscales completos para CFDI: RFC, razón social, régimen fiscal, uso de CFDI, código postal
- Tipos de cliente: público general, mayoreo, distribuidor
- Asignación de listas de precios por tipo
- Línea de crédito: monto máximo, días de plazo, alerta al vencer
- Estado de cuenta: ventas a crédito, pagos recibidos, saldo actual
- Registro de pagos (abonos) con aplicación a facturas/notas específicas
- Bloqueo automático si excede crédito o tiene facturas vencidas (con override del admin)
- Historial completo de compras (qué producto, fechas) — útil para upsell

**Eventos:**
- `cliente.creado`, `cliente.actualizado`
- `pago.recibido` → escuchan: Reportes, Facturación (si aplica complemento de pago)
- `cliente.excedio_credito` → notificación al supervisor

**Tablas principales:**
- `clientes`
- `cliente_direcciones`
- `cliente_pagos`
- `cliente_saldos` (vista materializada para consulta rápida)

---

### 3.3 Módulo: Proveedores

**Responsabilidad:** Gestionar proveedores y compras (entrada de mercancía a bodega).

**Funcionalidad clave:**
- Alta/edición/baja lógica de proveedores con datos fiscales
- Catálogo de productos por proveedor con precios de costo
- Órdenes de compra (OC) con estado: borrador → enviada → recibida parcial → recibida total
- Recepción de mercancía: actualiza inventario en bodega, registra costo
- Captura de factura del proveedor (XML CFDI recibido) para conciliación
- Cuentas por pagar: saldo con cada proveedor, vencimientos
- Registro de pagos a proveedores

**Eventos:**
- `compra.recibida` → escuchan: Inventario (sumar stock), Reportes
- `factura_proveedor.capturada` → escuchan: Contabilidad (futuro)

**Tablas principales:**
- `proveedores`
- `ordenes_compra`
- `oc_lineas`
- `recepciones_mercancia`
- `proveedor_pagos`

---

### 3.4 Módulo: Productos e Inventario

**Responsabilidad:** Catálogo de productos y control de existencias por ubicación.

**Funcionalidad clave:**
- Catálogo con: SKU, código de barras, nombre, descripción, marca, categoría, unidad de medida
- **Campos especializados (opcionales, p.ej. farmacia / veterinaria):**
  - Tipo: medicamento / alimento / accesorio / servicio
  - Especie objetivo (perro, gato, bovino, equino, aviar, etc.)
  - Requiere receta médica (sí/no)
  - Sustancia controlada (sí/no) — para reportes COFEPRIS
  - Lote y caducidad (obligatorio para medicamentos y alimentos)
  - Laboratorio fabricante
  - Vía de administración
- Múltiples precios por producto (público, mayoreo, distribuidor)
- Costos: último costo, costo promedio, costo de reposición
- **Inventario por ubicación:** tienda y bodega son ubicaciones separadas
- Transferencias entre ubicaciones (con folio y autorización)
- Ajustes de inventario con motivo (merma, caducidad, robo, conteo físico)
- Alertas: stock mínimo, productos por caducar (30/60/90 días)
- Kardex completo: toda entrada y salida con trazabilidad

**Eventos:**
- `producto.bajo_stock` → notificación
- `producto.por_caducar` → notificación
- `inventario.movimiento` → siempre que cambia stock (compra, venta, ajuste, transferencia)

**Tablas principales:**
- `productos`
- `producto_precios`
- `producto_lotes`
- `ubicaciones` (tienda, bodega, futuras sucursales)
- `inventario` (stock por producto + ubicación + lote)
- `inventario_movimientos` (kardex)

---

### 3.5 Módulo: Facturación (CFDI 4.0)

**Responsabilidad:** Emitir, cancelar y consultar CFDIs ante el SAT vía Facturama.

**Funcionalidad clave:**
- Generación de CFDI 4.0 a partir de una venta o de varias (factura global mensual de público general)
- Tipos soportados: Ingreso, Egreso (notas de crédito), Pago (complemento de pago para crédito)
- Catálogos SAT actualizados: productos/servicios, unidades, regímenes, usos CFDI, formas y métodos de pago
- Validación previa al timbrado (evita rechazos del SAT)
- Almacenamiento de XML y PDF generados
- Envío automático por email al cliente
- Cancelación de CFDI con motivo (01, 02, 03, 04) y sustitución si aplica
- Reporte de facturas emitidas/canceladas
- Factura global de tickets de público general (configurable diaria/semanal/mensual)
- Configuración de series y folios (A para ingresos, B para egresos, P para pagos)

**Integración Facturama:**
- Cliente HTTP encapsulado en `lib/integrations/facturama/`
- Adapter pattern para poder cambiar de PAC en el futuro sin tocar la lógica de negocio
- Manejo de errores con reintentos exponenciales
- Modo sandbox para pruebas

**Eventos:**
- `factura.timbrada` → escuchan: Clientes (estado de cuenta), Reportes
- `factura.cancelada` → escuchan: Clientes, Inventario (si aplica)

**Tablas principales:**
- `facturas` (relación 1:N con ventas, ya que una factura puede incluir varias ventas)
- `factura_lineas`
- `facturas_canceladas`
- `cfdi_archivos` (paths a XMLs y PDFs)

---

### 3.6 Módulo: Usuarios y permisos (RBAC)

**Responsabilidad:** Autenticación, autorización por rol, auditoría.

**Roles predefinidos:**
| Rol | Permisos |
|-----|----------|
| **Administrador** | Todo, incluyendo configuración del sistema y reportes financieros |
| **Supervisor** | Ventas, cancelaciones, autorizar descuentos, ver reportes operativos |
| **Cajero/Vendedor** | Solo vender, consultar productos, consultar saldo de cliente |
| **Almacenista** | Recepciones, transferencias, ajustes de inventario, conteos físicos |
| **Solo lectura** | Consulta de reportes sin modificar nada (útil para el contador externo) |

**Funcionalidad clave:**
- Login con usuario/contraseña + opcional 2FA (TOTP) para administradores
- Recuperación de contraseña por email
- Sesiones con expiración configurable (default 8 horas)
- Bloqueo tras 5 intentos fallidos
- Cada acción crítica se registra en `audit_log` con: usuario, IP, acción, antes/después, timestamp
- Permisos granulares por módulo: leer / crear / editar / eliminar / autorizar

**Tablas principales:**
- `usuarios`
- `roles`
- `permisos`
- `rol_permisos`
- `usuario_roles`
- `audit_log`
- `sesiones`

---

### 3.7 Módulo: Configuración

**Responsabilidad:** Parámetros del sistema editables sin tocar código.

**Secciones:**
- **Empresa:** RFC, razón social, dirección, logo, certificado de sello digital (CSD)
- **Sucursales/ubicaciones:** tienda, bodega, futuras sucursales
- **Listas de precios:** público, mayoreo, distribuidor
- **Formas de pago:** efectivo, tarjeta, transferencia, crédito
- **Impresoras:** ticket térmico, factura tamaño carta
- **Series y folios:** A001, B001, P001
- **Catálogos auxiliares:** categorías, marcas, laboratorios, especies
- **Parámetros generales:** IVA aplicable, redondeo, decimales, moneda
- **Integraciones:** credenciales Facturama, SMTP para correos
- **Respaldos:** programación de respaldos a la nube
- **Gestión de usuarios:** alta de usuarios del sistema con asignación de rol

---

### 3.8 Módulo: Reportes

**Responsabilidad:** Consulta de información operativa y de negocio.

**Reportes obligatorios (los que pediste explícitamente):**
1. **Ventas del día** — total, número de tickets, ticket promedio, por hora
2. **Ventas por usuario** — quién vendió cuánto, en qué horario
3. **Clientes que compraron** — listado del día/rango con totales y productos
4. **Productos vendidos** — ranking por cantidad y por monto, en rango de fechas

**Reportes adicionales recomendados:**
5. **Corte de caja** — efectivo esperado vs contado, diferencias
6. **Inventario actual** — stock por ubicación, valorizado a costo y a precio venta
7. **Productos por caducar** — alertas a 30/60/90 días
8. **Productos sin movimiento** — no se han vendido en X días
9. **Cuentas por cobrar** — saldos de clientes, antigüedad de saldos
10. **Cuentas por pagar** — saldos a proveedores
11. **Margen por producto/categoría** — utilidad bruta
12. **Facturas emitidas y canceladas** — para conciliación con contador
13. **Auditoría** — bitácora de acciones críticas (cancelaciones, ajustes, cambios de precio)

**Características:**
- Filtros por rango de fechas, usuario, ubicación, categoría, cliente
- Exportación a Excel y PDF
- Gráficas (Recharts) para los principales: ventas por día, top productos, top clientes
- Reportes guardables (favoritos) con un clic

---

## 4. Modelo de datos (Prisma — extracto clave)

```prisma
// === EMPRESA Y UBICACIONES ===
model Empresa {
  id              String   @id @default(cuid())
  rfc             String
  razonSocial     String
  regimenFiscal   String
  codigoPostal    String
  direccion       String
  // ... certificado, logo, etc.
  ubicaciones     Ubicacion[]
}

model Ubicacion {
  id          String @id @default(cuid())
  empresaId   String
  nombre      String   // "Tienda", "Bodega"
  tipo        TipoUbicacion // TIENDA, BODEGA, SUCURSAL
  activa      Boolean @default(true)
  empresa     Empresa @relation(fields: [empresaId], references: [id])
  inventarios Inventario[]
}

// === PRODUCTOS ===
model Producto {
  id                String   @id @default(cuid())
  sku               String   @unique
  codigoBarras      String?  @unique
  nombre            String
  descripcion       String?
  marca             String?
  categoriaId       String?
  unidadMedida      String   // "PZA", "KG", "ML", "DOSIS"
  tipo              TipoProducto // MEDICAMENTO, ALIMENTO, ACCESORIO, SERVICIO
  especie           String?  // "Canino", "Felino", "Bovino", etc.
  requiereReceta    Boolean  @default(false)
  sustanciaControlada Boolean @default(false)
  laboratorio       String?
  viaAdministracion String?
  claveSAT          String   // clave producto/servicio SAT
  ivaAplicable      Decimal  // 0.00, 0.08, 0.16
  activo            Boolean  @default(true)
  precios           ProductoPrecio[]
  lotes             ProductoLote[]
  inventarios       Inventario[]
  ventaLineas       VentaLinea[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ProductoLote {
  id           String   @id @default(cuid())
  productoId   String
  lote         String
  caducidad    DateTime
  cantidad     Decimal  // cantidad restante de este lote
  costoUnitario Decimal
  producto     Producto @relation(fields: [productoId], references: [id])

  @@unique([productoId, lote])
}

model Inventario {
  id          String @id @default(cuid())
  productoId  String
  ubicacionId String
  stock       Decimal  @default(0)
  stockMinimo Decimal  @default(0)
  stockMaximo Decimal?
  producto    Producto @relation(fields: [productoId], references: [id])
  ubicacion   Ubicacion @relation(fields: [ubicacionId], references: [id])

  @@unique([productoId, ubicacionId])
}

// === CLIENTES ===
model Cliente {
  id              String   @id @default(cuid())
  codigo          String   @unique // CLI-0001
  nombre          String
  rfc             String?
  regimenFiscal   String?
  usoCFDI         String?
  codigoPostal    String?
  email           String?
  telefono        String?
  tipoCliente     TipoCliente // PUBLICO, MAYOREO, DISTRIBUIDOR
  listaPrecioId   String?
  lineaCredito    Decimal  @default(0)
  diasCredito     Int      @default(0)
  saldoActual     Decimal  @default(0)
  activo          Boolean  @default(true)
  ventas          Venta[]
  pagos           ClientePago[]
  createdAt       DateTime @default(now())
}

// === VENTAS ===
model Venta {
  id           String   @id @default(cuid())
  folio        String   @unique // V-2026-00001
  fecha        DateTime @default(now())
  ubicacionId  String
  usuarioId    String
  clienteId    String?
  cajaId       String
  subtotal     Decimal
  descuento    Decimal  @default(0)
  iva          Decimal
  total        Decimal
  estatus      EstatusVenta // ACTIVA, CANCELADA
  formaCobro   FormaCobro // CONTADO, CREDITO
  facturada    Boolean  @default(false)
  facturaId    String?
  motivoCancel String?
  lineas       VentaLinea[]
  pagos        VentaPago[]
  cliente      Cliente? @relation(fields: [clienteId], references: [id])
  // índices para reportes
  @@index([fecha])
  @@index([usuarioId, fecha])
  @@index([clienteId])
}

model VentaLinea {
  id          String  @id @default(cuid())
  ventaId     String
  productoId  String
  loteId      String?
  cantidad    Decimal
  precioUnit  Decimal
  descuento   Decimal @default(0)
  importe     Decimal
  venta       Venta @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  producto    Producto @relation(fields: [productoId], references: [id])
}

// === AUDITORÍA ===
model AuditLog {
  id         String   @id @default(cuid())
  usuarioId  String
  modulo     String
  accion     String
  entidad    String   // "venta", "producto", etc.
  entidadId  String?
  antes      Json?
  despues    Json?
  ip         String?
  userAgent  String?
  fecha      DateTime @default(now())
  @@index([fecha])
  @@index([usuarioId])
  @@index([entidad, entidadId])
}
```

*(El esquema completo incluye ~30 tablas; este extracto muestra las más importantes.)*

---

## 5. Despliegue híbrido (local + nube)

### 5.1 Servidor local en la tienda

**Hardware mínimo sugerido:**
- Mini PC (Intel NUC o equivalente) con 16GB RAM, SSD 500GB
- UPS para protección contra cortes de luz
- Conectado a la red local por cable (no WiFi)

**Software:**
- Ubuntu Server 24.04 LTS
- Docker + Docker Compose
- Contenedores:
  - `pos-web` (Next.js)
  - `pos-db` (PostgreSQL 16)
  - `pos-backup` (cron que respalda a S3/Backblaze cada hora)
  - `pos-sync` (replicación lógica hacia la nube)

**`docker-compose.yml` simplificado:**
```yaml
services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://pos:pass@db:5432/pos
      NEXTAUTH_URL: http://localhost:3000
    depends_on: [db]

  db:
    image: postgres:16
    volumes:
      - pos_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: pos
      POSTGRES_USER: pos
      POSTGRES_PASSWORD: pass

  backup:
    image: pos-backup:latest
    volumes:
      - pos_data:/data:ro
    environment:
      S3_BUCKET: ligerito-backups

volumes:
  pos_data:
```

### 5.2 Réplica en la nube

- **Base de datos espejo:** Supabase o Neon (PostgreSQL serverless) con replicación lógica desde el local
- **App en nube:** Vercel o Railway, lectura/escritura contra la BD en nube
- **Modo failover:** si el servidor local se cae, los usuarios apuntan al dominio en la nube y siguen operando
- **Reconciliación:** cuando el local vuelve, un job sincroniza los cambios

### 5.3 Modo offline (en el navegador)

- Service Worker que cachea la app
- IndexedDB para guardar ventas hechas sin conexión
- Al recuperar conexión, las ventas se envían al servidor (con detección de conflictos por folio)
- La caja siempre puede vender mientras tenga al menos el catálogo en caché

---

## 6. Seguridad

- **Contraseñas:** bcrypt con cost 12, mínimo 10 caracteres
- **Sesiones:** JWT con rotación, almacenadas en cookies httpOnly + secure
- **CSRF:** tokens en formularios sensibles
- **Rate limiting:** por IP en endpoints de login y de facturación
- **HTTPS obligatorio** en producción (Let's Encrypt en servidor local con Caddy)
- **Backups cifrados** (AES-256) antes de subir a S3
- **Variables sensibles:** en `.env`, nunca en el repositorio
- **CSD del SAT:** almacenado cifrado, con contraseña separada
- **Auditoría:** toda acción de admin o supervisor queda en `audit_log` por al menos 5 años
- **RFC y datos fiscales:** cifrado en reposo (pgcrypto)

---

## 7. Plan de implementación por fases

### Fase 1 — MVP funcional (4–6 semanas)
**Objetivo:** poder vender y cobrar
- Autenticación y usuarios básicos
- Catálogo de productos e inventario en una ubicación
- Pantalla de venta con efectivo y tarjeta
- Clientes básicos (sin crédito todavía)
- Reporte: ventas del día, productos vendidos
- Ticket impreso

### Fase 2 — Operación completa (3–4 semanas)
- Segunda ubicación (bodega) con transferencias
- Crédito a clientes y cobranza
- Proveedores y órdenes de compra
- Recepciones de mercancía con costos
- Cierre de caja
- Reportes operativos completos

### Fase 3 — Facturación electrónica (2–3 semanas)
- Integración Facturama (sandbox primero)
- Emisión de CFDI 4.0 Ingreso
- Factura global de público general
- Complemento de pago
- Cancelaciones

### Fase 4 — Robustez y despliegue híbrido (2 semanas)
- Despliegue en servidor local
- Replicación a la nube
- Modo offline en el navegador
- Respaldos automáticos
- Capacitación al personal

### Fase 5 — Extras y refinamiento (continuo)
- Lectores de código de barras USB
- Báscula para productos a granel (alimento)
- Envío de tickets por WhatsApp
- App móvil para inventario físico
- Dashboard de KPIs en TV de oficina

---

## 8. Decisiones técnicas razonadas

| Decisión | Por qué |
|----------|---------|
| **Next.js en lugar de React puro** | Server Actions reducen código de API, mejor SEO si algún día hay tienda en línea, una sola tecnología para todo |
| **PostgreSQL en lugar de MySQL** | Mejor manejo de tipos decimales (críticos para dinero), soporte robusto para JSON (auditoría), replicación lógica nativa |
| **Prisma en lugar de SQL crudo** | Type-safety, migraciones versionadas, productividad alta sin perder control |
| **Monolito modular en lugar de microservicios** | Para una tienda + bodega los microservicios son sobreingeniería. La modularidad interna basta y permite extraer servicios después si crece. |
| **Híbrido local+nube** | Tienda no depende del internet (que en regiones puede fallar), pero gana respaldo y acceso remoto |
| **Facturama** | Documentación clara en español, sandbox gratuito, soporta CFDI 4.0 y complementos, precio razonable |
| **shadcn/ui** | Componentes copiables (no dependencia oculta), accesibles, personalizables, ahorra meses de UI |
| **Atajos de teclado obligatorios** | Cajeros venden rápido con teclado; el mouse los frena. Estándar en todos los POS profesionales. |

---

## 9. Glosario rápido

- **CFDI** — Comprobante Fiscal Digital por Internet (la factura electrónica mexicana)
- **PAC** — Proveedor Autorizado de Certificación (timbra los CFDI ante el SAT)
- **CSD** — Certificado de Sello Digital (las llaves del SAT para firmar facturas)
- **RFC** — Registro Federal de Contribuyentes
- **POS** — Point of Sale (Punto de Venta)
- **SKU** — Stock Keeping Unit (clave única de producto)
- **RBAC** — Role-Based Access Control (control de acceso por rol)
- **Kardex** — Registro histórico de movimientos de inventario
- **COFEPRIS** — autoridad sanitaria que regula sustancias controladas en MX

---

## 10. Próximos pasos sugeridos

1. **Definir el catálogo inicial** — exporta tu inventario actual a Excel; con eso se siembra la BD
2. **Conseguir el CSD del SAT** — necesario para facturar; trámite gratuito en el portal del SAT
3. **Abrir cuenta sandbox en Facturama** — gratuita, para desarrollo y pruebas
4. **Decidir hardware** — Mini PC + impresora térmica + lector de código de barras (~$8,000–$15,000 MXN)
5. **Comenzar con Fase 1 (MVP)** — en 4–6 semanas ya estás vendiendo con sistema propio

---

*Documento técnico v1.0 — Diseñado para una tienda + bodega con visión a 3–5 sucursales sin reescribir el sistema.*
