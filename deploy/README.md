# POSVet SaaS — multi-cliente (Fase 1)

Levanta **una instancia de POSVet por cliente** (cada una con su propia base de
datos) detrás de un proxy que enruta por subdominio:
`serengueti.localhost` → la instancia de serengueti.

POSVet **no se modifica**: es la misma app mono-cliente corriendo N veces. Mismo
modelo que la versión de escritorio (una app + su BD), por eso un cliente puede
empezar en la nube y migrar a escritorio (o al revés) después.

## Piezas

- **`Dockerfile`** (raíz): imagen de POSVet (servidor Next standalone).
- **`docker-compose.yml`**: stack base → **Traefik** (proxy) + **Postgres
  compartido** (una BD por cliente).
- **`provisionar.mjs`**: da de alta un cliente.
- **`desprovisionar.mjs`**: da de baja un cliente.
- **`dynamic/`**: rutas de Traefik por cliente (generadas).
- **`tenants/`**: secretos por cliente (generados).

## Arranque local (en tu PC)

```bash
# 1. Construir la imagen de POSVet
bash deploy/build-image.sh           # o: docker build -t posvet:latest .

# 2. Levantar el stack base (Traefik + Postgres)
cd deploy && docker compose up -d && cd ..

# 3. Dar de alta un cliente
node deploy/provisionar.mjs serengueti --nombre "Tienda Serengueti"

# 4. Abrir en Chrome
#    http://serengueti.localhost      (los *.localhost resuelven a 127.0.0.1 solos)
#    admin@posvet.local / admin12345
```

`provisionar.mjs` hace: crea `pos_<slug>` → migra → siembra (empresa + Tienda +
Bodega + admin) → instala la **licencia** del cliente → levanta el contenedor →
escribe su ruta en Traefik. Es **idempotente** (re-ejecutar no duplica datos).

### Dar de baja

```bash
node deploy/desprovisionar.mjs serengueti            # detiene; conserva la BD
node deploy/desprovisionar.mjs serengueti --purge    # además BORRA la BD
```

Elimina el contenedor, la ruta de Traefik y el secreto de la tienda.

### Respaldos

Cada tienda guarda sus datos en su BD `pos_<slug>` (dentro del volumen
`posvet-saas_saas-db-data`). Para respaldar/restaurar:

```bash
node deploy/respaldar.mjs serengueti      # respalda una tienda
node deploy/respaldar.mjs --all           # respalda todas
# → archivos en deploy/backups/<bd>-<fecha>.dump

# restaurar (DESTRUCTIVO: reemplaza la BD de esa tienda)
node deploy/restaurar.mjs serengueti deploy/backups/pos_serengueti-....dump
```

Para respaldos automáticos, agenda `respaldar.mjs --all` en un cron.

## Cómo se gana acceso desde internet (siguiente paso)

Para que **tienda y bodega** de serengueti entren desde sus locales, la instancia
debe ser alcanzable por internet. Dos caminos:

- **Túnel (rápido/barato):** Cloudflare Tunnel desde tu PC →
  `serengueti.sysccom.com` con HTTPS, sin abrir puertos. Bueno para arrancar.
- **VPS (sólido):** servidor con Docker + DNS wildcard `*.sysccom.com` apuntando
  a él. Mismo `provisionar.mjs`; solo cambia `BASE_DOMAIN=sysccom.com` en `.env`
  y se agrega el `:443` con TLS automático (Let's Encrypt) en Traefik.

## Notas técnicas

- **Traefik usa el *file provider*** (no el socket de Docker): los daemons nuevos
  rompen la negociación de versión de API del provider Docker de Traefik. El
  provisionador escribe `dynamic/<slug>.yml` y Traefik lo observa.
- **Puertos:** Postgres del SaaS en `5435` (dev usa 5432, licencias 5434).
- **Licencia:** cada instancia recibe una licencia offline a nombre del cliente
  (se ve "Licenciado a: …"). En la nube el corte real = apagar el contenedor.
- **Actualizar POSVet:** reconstruir la imagen y re-`provisionar` cada cliente
  (recrea su contenedor; la BD persiste y se migra sola).
