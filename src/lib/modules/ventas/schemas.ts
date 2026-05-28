import { z } from "zod";

export const formaPagoSchema = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO"]);
// POS expone las cuatro formas; la validación de CREDITO (requiere cliente con línea
// suficiente) la hace el service contra cliente.lineaCredito y saldoActual.
export const formaPagoMvpSchema = formaPagoSchema;

// IDs internos: vienen de selects poblados por el servidor o ya validados por FK de Postgres.
// No usamos .cuid() porque el seed de dev usa IDs legibles (ej. "ubicacion-tienda").
const idSchema = z.string().min(1, "ID requerido");
const idOpcionalSchema = idSchema.optional().or(z.literal("").transform(() => undefined));

export const abrirCajaSchema = z.object({
  ubicacionId: idSchema,
  fondoInicial: z.number().nonnegative().default(0),
  observaciones: z.string().trim().max(500).optional(),
});

export const cerrarCajaSchema = z.object({
  cajaId: idSchema,
  montoContadoEfectivo: z.number().nonnegative(),
  observaciones: z.string().trim().max(500).optional(),
});

export const ventaLineaSchema = z.object({
  productoId: idSchema,
  loteId: idOpcionalSchema,
  cantidad: z.number().positive(),
  // Descuento absoluto en moneda sobre el subtotal (precio * cantidad) ANTES de IVA.
  descuento: z.number().nonnegative().default(0),
});

export const ventaPagoSchema = z.object({
  forma: formaPagoMvpSchema,
  monto: z.number().positive(),
  referencia: z.string().trim().max(60).optional(),
});

export const crearVentaSchema = z
  .object({
    cajaId: idSchema,
    clienteId: idOpcionalSchema,
    descuentoGlobal: z.number().nonnegative().default(0),
    observaciones: z.string().trim().max(500).optional(),
    lineas: z.array(ventaLineaSchema).min(1, "Debe incluir al menos una línea"),
    pagos: z.array(ventaPagoSchema).min(1, "Debe registrar al menos un pago"),
  })
  .strict();

export const cancelarVentaSchema = z.object({
  ventaId: idSchema,
  motivo: z.string().trim().min(3, "Indica un motivo").max(300),
});

export type AbrirCajaInput = z.input<typeof abrirCajaSchema>;
export type AbrirCajaData = z.output<typeof abrirCajaSchema>;
export type CerrarCajaInput = z.input<typeof cerrarCajaSchema>;
export type CerrarCajaData = z.output<typeof cerrarCajaSchema>;
export type CrearVentaInput = z.input<typeof crearVentaSchema>;
export type CrearVentaData = z.output<typeof crearVentaSchema>;
export type CancelarVentaInput = z.input<typeof cancelarVentaSchema>;
export type CancelarVentaData = z.output<typeof cancelarVentaSchema>;
