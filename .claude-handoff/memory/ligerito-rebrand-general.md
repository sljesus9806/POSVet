---
name: ligerito-rebrand-general
description: "El proyecto dejó de ser solo veterinaria → POS general multi-giro \"Ligerito\"; frontera marca vs infraestructura"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d11a2a6-d46f-4290-8f86-27a8b13c9616
---

El POS se generalizó: ya **no es solo para veterinarias**, ahora es multi-giro (abarrotes, farmacia, veterinaria, papelería…). El **software se llama "Ligerito"** (el nombre del negocio lo pone cada cliente en `Empresa.razonSocial`, que sigue siendo configurable).

Decisiones (PR #34, rama `feature/pos-general`, abierto 2026-06-04, pendiente revisión/merge del usuario):
- **Niveles de precio/cliente:** `PUBLICO, MAYOREO, DISTRIBUIDOR` (antes `VETERINARIO`/`GRANJA`). Migración no destructiva `20260604120000_tipos_distribuidor` (RENAME VALUE + recrea enum sin GRANJA; GRANJA→PUBLICO, VETERINARIO→DISTRIBUIDOR).
- **Campos especializados de producto** (`especie`, `requiereReceta`, `sustanciaControlada`, `viaAdministracion`, `laboratorio`) NO se borran: quedan opcionales en una sección plegable del form, para que sirvan a farmacia/vet pero no estorben a abarrotes.

**Frontera marca vs infraestructura (decisión deliberada):** lo user-facing es "Ligerito"; la infraestructura sigue como "POSVet" a propósito — `admin@posvet.local`, contenedores `posvet-*`, imagen `posvet:latest`, `%APPDATA%/POSVet`, repo, paquetes `posvet-desktop`/`posvet-saas`. **No renombrar la infra sin que el usuario lo pida**: implica recrear BD/volúmenes y rompe despliegues. Los docs de ops conservan "POSVet" como codename del repo.

**Why:** el usuario quiso quitar referencias a veterinaria y volverlo general, pero manteniéndolo "ligerito" (sin sobre-ingeniería) y sin romper su entorno ya seedeado.

**How to apply:** al tocar UI/marca usa "Ligerito"; al tocar infra/scripts/despliegue, "POSVet" sigue vigente. Si pide rebrand de infra, es PR aparte.

Caveat operativo: hay clientes SaaS ya provisionados (`posvet-carniceriaestrella`, `posvet-rauveterinaria`, `posvet-medvet`); cada BD necesita correr `prisma migrate deploy` al actualizar al nuevo código.

Relacionado: [[licenciamiento-anticrack]], [[posvet-estado-y-mejoras]], [[entorno-local-jsalazar]].
