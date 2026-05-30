/**
 * Limpieza determinista de la BD de DEV para la suite de QA.
 * TRUNCATE de todas las tablas de la app (vía el cliente Prisma, NO `prisma migrate
 * reset`) + RESTART IDENTITY CASCADE. Después el caller corre el seed.
 *
 * Solo para DEV: opera sobre la BD de DATABASE_URL (localhost:5432/posvet, datos demo).
 */
import { prisma } from "../../src/lib/modules/shared/db";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(`Negado: DATABASE_URL no apunta a localhost (${url}). Reset solo en DEV.`);
  }
  const tablas = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tablas.length === 0) {
    console.log("(sin tablas que truncar)");
  } else {
    const lista = tablas.map((t) => `"${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
    console.log(`TRUNCATE OK (${tablas.length} tablas): ${tablas.map((t) => t.tablename).join(", ")}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error("RESET ERROR:", e); process.exit(1); });
