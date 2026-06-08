---
name: licenciamiento-anticrack
description: Sistema de licencias/membresía anti-cracking para vender POSVet a clientes; roadmap y decisiones
metadata: 
  node_type: memory
  type: project
  originSessionId: 64b0e0ff-7a68-4b54-8c1f-4eac0959d704
---

A partir del 2026-05-31 el sistema se considera listo y arranca una nueva línea: protegerlo para instalarlo en PCs de clientes (membresía mensual con kill-switch + opción offline).

**Decisiones de producto del usuario:**
- Soportar **ambos modos** por cliente: online (suscripción mensual, phone-home) y offline (perpetua, sin conexión a su plataforma).
- Al fallar/vencer: **bloqueo total con periodo de gracia** (nunca borra datos; solo cierra acceso).
- Offline **sin amarre a hardware** (licencia portátil). Mitigación acordada: "Licenciado a: <negocio>" visible + caducidad anual renovable.
- Escritorio: recomendado **Electron + Postgres embebido** (la BD es el reto real, hoy usa Postgres en Docker). Aún por confirmar/ejecutar.

**Marco honesto dado al usuario:** ningún software self-hosted es 100% incrackeable (el código corre en su máquina y se puede parchear); el objetivo es imposibilitar *falsificar* licencias (cripto asimétrica), elevar el costo de parchear y monitorear. Amenaza real = veterinarios, no crackers.

**Roadmap (módulo a módulo):**
1. `feature/licencia-core` — **MERGEADO (PR #28)**. Núcleo cripto Ed25519, módulo `src/lib/modules/licencia/`, gate de bloqueo en dashboard layout, scripts lic:keygen/emitir/instalar. Llave privada en `POSVet/.licencia/` (gitignored), pública embebida en `keys.ts`.
2. Plataforma servidor — **CONSTRUIDA (MVP, local)** en repo aparte `/home/jsalazar/posvet-licencias` (git propio, sin remoto aún; commit inicial 5881eff). Next 16 + Prisma 6 + Postgres (docker puerto 5434, proyecto compose `posvet-lic`) + NextAuth 5. Dashboard (clientes con semáforo de membresía, ficha con registrar pago/suspender/generar código manual) + API v1 `/activar`,`/renovar`,`/heartbeat`. Usa la MISMA llave que POSVet (copiada a `posvet-licencias/.licencia/private.pem`). VERIFICADO end-to-end: token emitido por HTTP es aceptado por el verificador+schema de POSVet. Seed: admin@posvet.local/admin12345 + cliente demo. Login admin/dashboard probado.
3. **Cliente online en POSVet** — **PR #29 abierto** (build ✓). `online.ts` con `activarOnline()` + `sincronizar()`; gate dispara sync en background con `after()` (modo online, throttle 6h, tolerante a fallos); script `lic:activar --url --clave`; Licencia +apiUrl/claveActivacion/ultimaSync. Verificado e2e: activa, renueva, y al suspender → 402 `membresia_inactiva` (no renueva). Acompaña cambio en plataforma (commit 213676b): **tokens online rodantes de vida corta** (VENTANA_ONLINE_DIAS=7) para que el kill-switch corte en ~7d+gracia, no al fin del mes. OFFLINE sigue durando hasta vigenteHasta.
4. Pasarela de pago (Stripe/MercadoPago) — fase posterior; hoy cobro manual.
5. **Empaquetado de escritorio** — **PR #30 abierto** (`feature/desktop-electron`). Electron + **Postgres embebido** (`embedded-postgres`), sin Docker. `desktop/` con `boot.mjs` (arranca PG embebido en carpeta del usuario, aplica migraciones por SQL directo SIN la CLI de Prisma e idempotente, siembra en 1er arranque, levanta Next standalone) y `main.js` (Electron). `next.config` ahora con `output: "standalone"`. **Verificado headless en Linux**: arranque completo (migraciones+seed+/login 200) y persistencia entre reinicios. **El .exe final debe construirse EN Windows** (binarios PG y NSIS son por-SO); pasos en `desktop/README.md`. Decisión: Postgres embebido (no SQLite) para NO tocar el esquema ni invalidar la QA; target solo Windows.

**Decisión clave:** tokens online cortos+rodantes (no atados a vigenteHasta) = el kill-switch real. Suspender en el dashboard corta al cliente en ~2 semanas máx.

## SaaS multi-cliente (nube)
Objetivo del usuario: en la plataforma "Nuevo cliente → serengueti" crea el cliente Y aprovisiona su POS; el cliente entra por `serengueti.sysccom.com` (dominio del usuario: **sysccom.com**); puede luego pasar a escritorio. Primer cliente real: **serengueti** (veterinaria de pueblo, **tienda + bodega en otra locación → necesita NUBE**, no escritorio, porque ambas ubicaciones comparten datos en vivo). Modelo elegido: **una instancia POSVet por cliente** (no multi-tenant en una app) → POSVet no se modifica. **Una BD por cliente** en Postgres compartido. Aprovisionamiento **semi-manual primero**, luego one-click. El usuario probará en su PC (Linux+Windows) y migrará a VPS al crecer.

- **Fase 1 — PR #31 abierto** (`feature/saas-provisioning`, apilado sobre #30). `Dockerfile` (imagen POSVet standalone), `deploy/docker-compose.yml` (Traefik **file provider** + Postgres compartido puerto 5435), `deploy/provisionar.mjs` (crea pos_<slug>, migra, siembra, instala licencia offline a nombre del cliente, levanta contenedor, escribe ruta Traefik) y `desprovisionar.mjs`. Subdominios `<slug>.localhost` (Chrome resuelve *.localhost solo). VERIFICADO local: serengueti.localhost operativo + 2 clientes aislados. **IMPORTANTE:** Traefik usa file provider porque su provider Docker rompe negociación de API con daemons nuevos (>=1.40); `DOCKER_API_VERSION` no lo arregla. Fix incluido: `/licencia` con `force-dynamic` (no prerenderizar, consulta BD).
- **Fase 2 (pendiente, requiere cuentas del usuario):** salir a internet con Cloudflare Tunnel (rápido) o VPS + DNS wildcard `*.sysccom.com`.
- **Fase 3 — HECHA** (repo `posvet-licencias`, commit local ab585cd). El dashboard crea el cliente Y aprovisiona su POS one-click: `src/lib/provision.ts` ejecuta `deploy/provisionar.mjs` (en segundo plano con `after()`); Cliente += slug/posUrl/posEstado/posLog; formulario con slug+checkbox; ficha con tarjeta "POS en la nube" (estado/enlace/botón). env `POSVET_REPO`, `POS_BASE_DOMAIN`. VERIFICADO: crear cliente → POS vivo en `<slug>.localhost`. Acopla los dos repos por ruta de filesystem (ok local/VPS co-locado).
- Pendiente: Fase 2 (túnel/VPS, requiere cuentas del usuario), Fase 4 (respaldos/operación), y refinar UX del aprovisionamiento (hoy el estado se ve al recargar la ficha).

**Cuidado operativo:** ambos repos tienen compose en `docker/`; deben usar nombres de proyecto distintos (POSVet=`posvet`, plataforma=`posvet-lic`) o recrean el contenedor del otro. Ya corregido con `name:` en el compose de la plataforma.

Ver también [[posvet-estado-y-mejoras]] y [[facturacion-en-pausa]].
