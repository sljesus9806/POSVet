# POSVet — Punto de Venta Veterinaria

Sistema de Punto de Venta con facturación CFDI 4.0 y cobranza para una tienda
veterinaria con bodega anexa. Diseñado para crecer de 1 tienda a 3-5 sucursales
sin reescribirse.

> Especificación técnica completa en [`docs/POS-Veterinaria-Especificacion.md`](./docs/POS-Veterinaria-Especificacion.md).

## Stack

- **Frontend/Backend:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui
- **BD:** PostgreSQL 16 + Prisma 6
- **Auth:** NextAuth.js v5 (Credentials + bcrypt) con sesión JWT
- **Validación:** Zod
- **Facturación:** Facturama API (CFDI 4.0) — Fase 3
- **Despliegue:** Híbrido — Docker en servidor local + réplica nube — Fase 4

## Estructura modular

Cada módulo es independiente y solo se comunica vía su `index.ts` público o por
eventos del `event-bus`. **Regla de oro:** un módulo NUNCA importa archivos
internos de otro módulo.

```
src/lib/modules/
├── shared/          # db, event-bus, audit (compartidos)
└── usuarios/        # módulo Auth/RBAC (este PR)
    ├── index.ts     # API pública (lo único que otros importan)
    ├── service.ts
    ├── repository.ts
    ├── schemas.ts
    ├── types.ts
    └── events.ts
```

Próximos módulos (en sus propias branches):
`productos`, `inventario`, `clientes`, `ventas`, `proveedores`, `facturacion`,
`reportes`, `configuracion`.

## Prerequisitos

- Node.js 20+
- Docker + Docker Compose
- `gh` CLI (opcional, para abrir PRs)

## Setup local

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Levantar Postgres (Docker)
npm run db:up

# 4. Aplicar migraciones + sembrar datos iniciales
npm run db:migrate
npm run db:seed

# 5. Levantar Next.js
npm run dev
```

Abre http://localhost:3000 — el middleware te redirige a `/login`.

**Usuario admin sembrado (cámbialo en producción):**
- Email: `admin@posvet.local`
- Password: `admin12345`

## Scripts útiles

| Script               | Descripción                                       |
|----------------------|---------------------------------------------------|
| `npm run dev`        | Levanta Next.js en modo desarrollo                |
| `npm run build`      | Build de producción                               |
| `npm run lint`       | ESLint                                            |
| `npm run db:up`      | Levanta Postgres en Docker                        |
| `npm run db:down`    | Detiene Postgres                                  |
| `npm run db:logs`    | Logs del contenedor Postgres                      |
| `npm run db:psql`    | Abre `psql` dentro del contenedor                 |
| `npm run db:migrate` | `prisma migrate dev`                              |
| `npm run db:seed`    | Ejecuta `prisma/seed.ts`                          |
| `npm run db:reset`   | Borra la BD y reaplica migraciones + seed         |
| `npm run db:generate`| Regenera el cliente de Prisma                     |

## Roles del sistema (RBAC)

| Código        | Descripción                                                |
|---------------|------------------------------------------------------------|
| `ADMIN`       | Acceso total al sistema y configuración                    |
| `SUPERVISOR`  | Ventas, cancelaciones, autorizar descuentos, reportes      |
| `CAJERO`      | Vender, consultar productos y saldo de cliente             |
| `ALMACENISTA` | Recepciones, transferencias, ajustes de inventario         |
| `READONLY`    | Solo lectura de reportes (útil para contador externo)      |

Permisos en formato `modulo:accion` (ej. `ventas:crear`, `productos:editar`).
Ver [`prisma/seed.ts`](./prisma/seed.ts) para la asignación inicial.

## Seguridad

- Contraseñas con `bcryptjs` (cost 12)
- Bloqueo automático tras 5 intentos fallidos (15 minutos)
- Cada login (exitoso o fallido) queda registrado en `IntentoLogin`
- Cada acción crítica queda registrada en `AuditLog` (usuario + IP + antes/después)
- Sesión JWT (httpOnly cookie) con expiración de 8 horas

## Plan por fases

- **Fase 1 (MVP)** ← *en curso* — Auth/RBAC, productos, ventas básicas, ticket
- Fase 2 — Bodega + transferencias, crédito a clientes, proveedores, cierre de caja
- Fase 3 — Facturación electrónica (Facturama, CFDI 4.0)
- Fase 4 — Despliegue híbrido (Docker local + nube + modo offline)
- Fase 5 — Extras (lectores código de barras, báscula, WhatsApp, etc.)
