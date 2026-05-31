# Imagen de POSVet para la nube (una instancia por cliente).
# Construye el servidor Next standalone; la BD vive en un Postgres externo
# (DATABASE_URL en runtime). Migraciones y seed los corre el provisionador.

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
# Next standalone no copia static/public; los dejamos junto al server.
RUN cp -r .next/static .next/standalone/.next/static \
  && if [ -d public ]; then cp -r public .next/standalone/public; fi

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
