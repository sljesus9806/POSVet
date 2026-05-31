import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaquetado de escritorio: genera un servidor Node mínimo y autocontenido
  // en .next/standalone que Electron puede arrancar sin `next` ni node_modules
  // completos. No afecta el dev ni el deploy web normal.
  output: "standalone",

  // El motor de Prisma (binario) no siempre lo detecta el tracing de Next;
  // lo incluimos explícitamente para que el standalone pueda consultar la BD.
  outputFileTracingIncludes: {
    "**": ["./node_modules/.prisma/client/**", "./prisma/**"],
  },

  // Evita que Turbopack/Webpack cargue el barrel completo de paquetes con
  // muchos íconos/componentes. lucide-react se usa en 50+ archivos; sin
  // esta optimización cada uno re-compila el bundle entero.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Mantiene en memoria las páginas ya compiladas mucho más tiempo durante
  // dev (default 25s). Evita re-compilar al volver a una ruta visitada.
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 8,
  },
};

export default nextConfig;
