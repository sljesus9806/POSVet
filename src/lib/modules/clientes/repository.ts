import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";

export const clientesRepository = {
  listar(opts: { q?: string; tipo?: Prisma.ClienteWhereInput["tipoCliente"]; soloActivos?: boolean } = {}) {
    const where: Prisma.ClienteWhereInput = {};
    if (opts.soloActivos !== false) where.activo = true;
    if (opts.tipo) where.tipoCliente = opts.tipo;
    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { rfc: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telefono: { contains: q, mode: "insensitive" } },
      ];
    }
    return prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      take: 200,
    });
  },

  buscarPorId(id: string) {
    return prisma.cliente.findUnique({ where: { id } });
  },

  buscarPorCodigo(codigo: string) {
    return prisma.cliente.findUnique({ where: { codigo } });
  },

  crear(data: Prisma.ClienteCreateInput) {
    return prisma.cliente.create({ data });
  },

  actualizar(id: string, data: Prisma.ClienteUpdateInput) {
    return prisma.cliente.update({ where: { id }, data });
  },

  // Folio CLI-NNNNN. Lo genera dentro de una transacción contando los existentes
  // y reintentando ante conflicto de unicidad. Suficiente para volúmenes esperados
  // (≤ millones de clientes por empresa).
  proximoCodigo(tx: Prisma.TransactionClient) {
    return tx.cliente.count().then((n) => `CLI-${String(n + 1).padStart(5, "0")}`);
  },
};
