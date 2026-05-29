import { Prisma } from "@prisma/client";
import { prisma } from "../shared/db";
import { eventBus } from "../shared/event-bus";
import { audit } from "../shared/audit";
import { clientesRepository } from "./repository";
import {
  actualizarClienteSchema,
  crearClienteSchema,
  type ActualizarClienteInput,
  type CrearClienteInput,
} from "./schemas";
import { CLIENTE_EVENTS } from "./events";
import type { ClienteDetalle, ClienteListado, TipoCliente, TipoPrecio } from "./types";

export class ClienteNoEncontradoError extends Error {
  constructor(id: string) {
    super(`Cliente ${id} no encontrado`);
    this.name = "ClienteNoEncontradoError";
  }
}

export class CodigoClienteDuplicadoError extends Error {
  constructor(codigo: string) {
    super(`Ya existe un cliente con código ${codigo}`);
    this.name = "CodigoClienteDuplicadoError";
  }
}

const MAPA_TIPO_PRECIO: Record<TipoCliente, TipoPrecio> = {
  PUBLICO: "PUBLICO",
  MAYOREO: "MAYOREO",
  VETERINARIO: "VETERINARIO",
  // GRANJA suele comprar volumen → mayoreo (ajustable luego).
  GRANJA: "MAYOREO",
};

export function tipoPrecioEfectivo(c: { tipoCliente: TipoCliente; tipoPrecio: TipoPrecio | null }): TipoPrecio {
  return c.tipoPrecio ?? MAPA_TIPO_PRECIO[c.tipoCliente];
}

function aListado(c: Awaited<ReturnType<typeof clientesRepository.buscarPorId>> & {}): ClienteListado {
  if (!c) throw new Error("aListado requiere cliente no nulo");
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    rfc: c.rfc,
    tipoCliente: c.tipoCliente,
    tipoPrecioEfectivo: tipoPrecioEfectivo({ tipoCliente: c.tipoCliente, tipoPrecio: c.tipoPrecio }),
    email: c.email,
    telefono: c.telefono,
    activo: c.activo,
    lineaCredito: Number(c.lineaCredito.toString()),
    saldoActual: Number(c.saldoActual.toString()),
    diasCredito: c.diasCredito,
  };
}

function aDetalle(c: NonNullable<Awaited<ReturnType<typeof clientesRepository.buscarPorId>>>): ClienteDetalle {
  return {
    ...aListado(c),
    regimenFiscal: c.regimenFiscal,
    usoCFDI: c.usoCFDI,
    codigoPostal: c.codigoPostal,
    notas: c.notas,
    tipoPrecio: c.tipoPrecio,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const clientesService = {
  async listar(opts: { q?: string; tipo?: TipoCliente; soloActivos?: boolean } = {}): Promise<ClienteListado[]> {
    const filas = await clientesRepository.listar(opts);
    return filas.map(aListado);
  },

  async obtener(id: string): Promise<ClienteDetalle | null> {
    const c = await clientesRepository.buscarPorId(id);
    return c ? aDetalle(c) : null;
  },

  async crear(input: CrearClienteInput, ctx: { usuarioId: string; ip?: string | null }): Promise<ClienteDetalle> {
    const data = crearClienteSchema.parse(input);

    // Reintenta hasta 3 veces si el código colisiona (race entre transacciones).
    let cliente: Awaited<ReturnType<typeof clientesRepository.buscarPorId>> = null;
    let lastError: unknown;
    for (let intento = 0; intento < 3; intento++) {
      try {
        cliente = await prisma.$transaction(async (tx) => {
          const codigo = await clientesRepository.proximoCodigo(tx);
          return tx.cliente.create({
            data: {
              codigo,
              nombre: data.nombre,
              rfc: data.rfc,
              regimenFiscal: data.regimenFiscal,
              usoCFDI: data.usoCFDI,
              codigoPostal: data.codigoPostal,
              email: data.email,
              telefono: data.telefono,
              notas: data.notas,
              tipoCliente: data.tipoCliente,
              tipoPrecio: data.tipoPrecio ?? null,
              lineaCredito: data.lineaCredito,
              diasCredito: data.diasCredito,
            },
          });
        });
        break;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("codigo")
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    if (!cliente) throw lastError ?? new Error("No se pudo generar código único");

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "clientes",
      accion: "crear",
      entidad: "cliente",
      entidadId: cliente.id,
      despues: { codigo: cliente.codigo, nombre: cliente.nombre, tipoCliente: cliente.tipoCliente },
      ip: ctx.ip,
    });
    await eventBus.emit(CLIENTE_EVENTS.CREADO, {
      clienteId: cliente.id,
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      tipoCliente: cliente.tipoCliente,
      usuarioId: ctx.usuarioId,
    });

    return aDetalle(cliente);
  },

  async actualizar(input: ActualizarClienteInput, ctx: { usuarioId: string; ip?: string | null }): Promise<ClienteDetalle> {
    const data = actualizarClienteSchema.parse(input);
    const actual = await clientesRepository.buscarPorId(data.id);
    if (!actual) throw new ClienteNoEncontradoError(data.id);

    const update: Prisma.ClienteUpdateInput = {};
    if (data.nombre !== undefined) update.nombre = data.nombre;
    if (data.rfc !== undefined) update.rfc = data.rfc ?? null;
    if (data.regimenFiscal !== undefined) update.regimenFiscal = data.regimenFiscal ?? null;
    if (data.usoCFDI !== undefined) update.usoCFDI = data.usoCFDI ?? null;
    if (data.codigoPostal !== undefined) update.codigoPostal = data.codigoPostal ?? null;
    if (data.email !== undefined) update.email = data.email ?? null;
    if (data.telefono !== undefined) update.telefono = data.telefono ?? null;
    if (data.notas !== undefined) update.notas = data.notas ?? null;
    if (data.tipoCliente !== undefined) update.tipoCliente = data.tipoCliente;
    if (data.tipoPrecio !== undefined) update.tipoPrecio = data.tipoPrecio ?? null;
    if (data.lineaCredito !== undefined) update.lineaCredito = data.lineaCredito;
    if (data.diasCredito !== undefined) update.diasCredito = data.diasCredito;
    if (data.activo !== undefined) update.activo = data.activo;

    const actualizado = await clientesRepository.actualizar(data.id, update);

    await audit({
      usuarioId: ctx.usuarioId,
      modulo: "clientes",
      accion: "editar",
      entidad: "cliente",
      entidadId: data.id,
      antes: { nombre: actual.nombre, activo: actual.activo, tipoCliente: actual.tipoCliente },
      despues: { nombre: actualizado.nombre, activo: actualizado.activo, tipoCliente: actualizado.tipoCliente },
      ip: ctx.ip,
    });
    await eventBus.emit(CLIENTE_EVENTS.ACTUALIZADO, {
      clienteId: actualizado.id,
      codigo: actualizado.codigo,
      usuarioId: ctx.usuarioId,
    });
    if (data.activo === false && actual.activo) {
      await eventBus.emit(CLIENTE_EVENTS.DESACTIVADO, {
        clienteId: actualizado.id,
        codigo: actualizado.codigo,
        usuarioId: ctx.usuarioId,
      });
    }

    return aDetalle(actualizado);
  },
};
