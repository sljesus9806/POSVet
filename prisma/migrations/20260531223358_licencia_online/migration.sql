-- AlterTable
ALTER TABLE "Licencia" ADD COLUMN     "apiUrl" TEXT,
ADD COLUMN     "claveActivacion" TEXT,
ADD COLUMN     "ultimaSync" TIMESTAMP(3);
