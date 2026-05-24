@AGENTS.md

# POSVet — instrucciones para Claude

POS Veterinario modular en Next.js. Spec técnica en
[`docs/POS-Veterinaria-Especificacion.md`](./docs/POS-Veterinaria-Especificacion.md) — léela
antes de tocar un módulo nuevo.

## Workflow obligatorio

- **Un módulo a la vez.** No empezar `feature/<nuevo>` hasta que el PR anterior esté mergeado.
- **Branch por módulo:** `feature/<modulo>` (ej. `feature/productos-inventario`).
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`).
- Yo abro PR con `gh pr create`; **el usuario revisa y mergea** en GitHub. Nunca mergear yo mismo.
- No commits directos a `main`.

## Regla de oro modular

Cada módulo vive en `src/lib/modules/<modulo>/` y solo expone su `index.ts`. Un módulo
**NUNCA** importa archivos internos (`service.ts`, `repository.ts`, etc.) de otro módulo —
solo lo público a través del index. Para comunicación cruzada, usar `event-bus` (en
`src/lib/modules/shared/event-bus.ts`).

Estructura de cada módulo:
```
<modulo>/
├── index.ts         # API pública
├── service.ts       # Lógica de negocio
├── repository.ts    # Acceso a datos (Prisma)
├── schemas.ts       # Validación Zod
├── types.ts         # Tipos TS
└── events.ts        # Constantes + payloads de eventos
```

## Stack y versiones (no las cambies sin discutir)

| Pieza        | Versión       | Notas                                                     |
|--------------|---------------|-----------------------------------------------------------|
| Next.js      | 16.2.6        | App Router. `middleware.ts` está deprecado → `proxy.ts`.  |
| React        | 19.2.4        | Concurrent features activas.                              |
| Tailwind     | 4             | CSS-first config en `globals.css`, sin `tailwind.config`. |
| shadcn/ui    | latest        | Tema slate, components.json ya configurado.               |
| Prisma       | **6** (no 7)  | Prisma 7 sacó la URL del schema; bajamos a 6 estable.     |
| NextAuth     | 5.0.0-beta    | Única versión con soporte oficial para Next 16 + App Router. |
| Node         | 20+ (probado 26) | tsx para scripts de Prisma.                            |

## Decisiones técnicas con razón

- **No usar `proxy.ts` para auth.** El Data Security guide de Next 16 recomienda verificar
  auth en cada layout/server action, no confiar solo en proxy/middleware. Cada layout
  protegido hace `await auth()` y `redirect("/login")` si no hay sesión. Lo hacemos en
  `src/app/(dashboard)/layout.tsx`.
- **Sesión JWT (no DB sessions).** 8 horas, cookie httpOnly. La info de roles/permisos va
  en el token (callbacks `jwt` y `session` en `src/auth.config.ts`).
- **`src/auth.config.ts` es edge-safe** (sin bcrypt, sin Prisma). `src/auth.ts` agrega el
  Credentials provider que sí usa bcrypt. Mantén esa separación si en el futuro vuelves a
  necesitar el middleware en edge.
- **bcrypt cost 12, bloqueo tras 5 intentos por 15 min.** Constantes en
  `src/lib/modules/usuarios/service.ts`.
- **`AGENTS.md`** del scaffold dice "This is NOT the Next.js you know" — antes de escribir
  código de Next, consulta `node_modules/next/dist/docs/`.

## Comandos clave

```bash
npm run db:up        # Postgres local en Docker (puerto 5432)
npm run db:down
npm run db:migrate   # prisma migrate dev
npm run db:seed      # roles, permisos, admin inicial
npm run db:reset     # destructivo: borra BD y reseedea
npm run dev          # Next.js
npm run build        # Verifica que tipos y prerender estén OK antes de PR
```

**Docker requiere `sg docker -c "..."`** si el usuario no ha cerrado sesión desde que
agregamos el grupo `docker`.

## Credenciales de seed (solo dev)

- Admin: `admin@posvet.local` / `admin12345` (definidas en `.env`).

## Estado del proyecto

- **Fase 1 — MVP**, en curso.
- Módulo Auth/Usuarios: PR #1 abierto (`feature/auth-usuarios`).
- Próximo: `feature/productos-inventario` (spec §3.4) — solo arrancar cuando #1 esté mergeado.

## Memoria persistente

Memorias adicionales (preferencias del usuario, contexto histórico) viven en
`~/.claude/projects/-home-manuel-POSVet/memory/`. Se cargan automáticamente.
