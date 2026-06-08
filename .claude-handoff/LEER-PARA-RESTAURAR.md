# Handoff de memoria de Claude (continuidad Linux → Windows)

Este folder es un **respaldo de las memorias de Claude Code** del proyecto,
para no perder el contexto al cambiar de sistema operativo. No es código del
producto; se puede borrar esta rama (`meta/handoff-memoria`) cuando termines.

## Cómo restaurar en Windows

1. Clona el repo y entra a la carpeta del proyecto.
2. Trae esta rama: `git fetch origin meta/handoff-memoria` y
   `git checkout meta/handoff-memoria` (o solo copia este folder).
3. Abre Claude Code en el proyecto y dile:
   **"restaura mis memorias desde `.claude-handoff/memory`"**.
   Claude copiará cada `.md` a la carpeta de memoria de ESTE equipo
   (`%USERPROFILE%\.claude\projects\<slug>\memory\`) y dejará `MEMORY.md` al día.
4. Vuelve a `main` y borra la rama de handoff cuando ya esté restaurado:
   `git checkout main` y `git push origin --delete meta/handoff-memoria`.

> El `<slug>` cambia en Windows (depende de la ruta del proyecto), por eso lo más
> fácil es que Claude lo resuelva en la primera sesión en vez de copiarlo a mano.

## Qué hay aquí
Las memorias activas del proyecto (estado, decisiones, gotchas). El índice es
`memory/MEMORY.md`.
