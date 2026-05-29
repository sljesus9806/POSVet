import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
