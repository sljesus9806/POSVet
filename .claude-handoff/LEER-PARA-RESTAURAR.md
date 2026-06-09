# Handoff de memoria de Claude (continuidad entre equipos)

Este folder es un **respaldo de las memorias de Claude Code** del proyecto, para no
perder contexto al cambiar de máquina/SO (Linux ⇄ Windows). No es código del producto.

Las memorias se viajan por el repo: aquí (`.claude-handoff/memory/`) queda el snapshot;
en cada equipo, Claude las copia a su carpeta de memoria local (cuyo `<slug>` depende de
la ruta del proyecto, por eso conviene que Claude lo resuelva en vez de copiarlo a mano).

## Cómo restaurar en el equipo nuevo
1. Clona/actualiza el repo y entra a la carpeta del proyecto:
   `git checkout main && git pull`
2. Abre Claude Code en el proyecto y dile:
   **"restaura mis memorias desde `.claude-handoff/memory`"**.
   Claude copiará cada `.md` a la carpeta de memoria de ESE equipo
   (`~/.claude/projects/<slug>/memory/` en Linux/Mac, `%USERPROFILE%\.claude\projects\<slug>\memory\` en Windows)
   y dejará `MEMORY.md` al día.
3. Confirma en esa primera sesión los detalles del entorno (ruta, shell, Postgres) —
   la memoria `entorno-local-jsalazar` te dice qué reconfirmar.

## Cómo actualizar este snapshot antes de cambiar de equipo
En el equipo donde trabajaste, dile a Claude:
**"haz las memorias necesarias para subirlas al repo"** — Claude copia las memorias
vivas a `.claude-handoff/memory/`, las commitea y abre PR. Mergéalo antes de moverte.

## Qué hay aquí
Las memorias activas del proyecto (estado, decisiones, gotchas). El índice es
`memory/MEMORY.md`. Última actualización del snapshot: **2026-06-09** (Windows → Linux).
