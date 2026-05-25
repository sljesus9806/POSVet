import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Opciones por defecto para transacciones interactivas. El default de Prisma
// es 5s, que en dev (cold-start de Turbopack + filesystem lento) se queda corto
// y en prod tampoco da margen para ventas con muchas líneas. 15s es generoso
// sin enmascarar problemas reales de performance.
export const TX_OPTS = {
  maxWait: 5_000, // tiempo máx esperando un slot de conexión
  timeout: 15_000, // tiempo máx de la transacción una vez iniciada
} as const;
