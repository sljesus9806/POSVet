-- Rebrand a POS general (Ligerito): renombrar el nivel de precio/cliente
-- VETERINARIO -> DISTRIBUIDOR y eliminar GRANJA.
-- Migración NO destructiva: conserva todas las filas existentes.

-- 1) Renombrar VETERINARIO -> DISTRIBUIDOR.
--    Cubre ProductoPrecio.tipo, Cliente.tipoPrecio y Venta.tipoPrecio (TipoPrecio)
--    y Cliente.tipoCliente (TipoCliente) sin perder datos.
ALTER TYPE "TipoPrecio" RENAME VALUE 'VETERINARIO' TO 'DISTRIBUIDOR';
ALTER TYPE "TipoCliente" RENAME VALUE 'VETERINARIO' TO 'DISTRIBUIDOR';

-- 2) Eliminar GRANJA de TipoCliente.
--    Postgres no soporta DROP VALUE en un enum, así que reasignamos las filas
--    que lo usen (a PUBLICO) y recreamos el tipo sin ese valor.
UPDATE "Cliente" SET "tipoCliente" = 'PUBLICO' WHERE "tipoCliente" = 'GRANJA';

ALTER TABLE "Cliente" ALTER COLUMN "tipoCliente" DROP DEFAULT;
ALTER TYPE "TipoCliente" RENAME TO "TipoCliente_old";
CREATE TYPE "TipoCliente" AS ENUM ('PUBLICO', 'MAYOREO', 'DISTRIBUIDOR');
ALTER TABLE "Cliente" ALTER COLUMN "tipoCliente" TYPE "TipoCliente" USING ("tipoCliente"::text::"TipoCliente");
ALTER TABLE "Cliente" ALTER COLUMN "tipoCliente" SET DEFAULT 'PUBLICO';
DROP TYPE "TipoCliente_old";
