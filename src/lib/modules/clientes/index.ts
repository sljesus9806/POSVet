// API pública del módulo Clientes.
// Otros módulos SOLO deben importar desde este archivo.

export {
  clientesService,
  tipoPrecioEfectivo,
  ClienteNoEncontradoError,
  CodigoClienteDuplicadoError,
} from "./service";

export {
  crearClienteSchema,
  actualizarClienteSchema,
  tipoClienteSchema,
  tipoPrecioSchema,
} from "./schemas";

export type {
  CrearClienteInput,
  ActualizarClienteInput,
} from "./schemas";

export type {
  ClienteListado,
  ClienteDetalle,
  TipoCliente,
  TipoPrecio,
} from "./types";

export {
  CLIENTE_EVENTS,
  type ClienteCreadoPayload,
  type ClienteActualizadoPayload,
  type ClienteDesactivadoPayload,
} from "./events";
