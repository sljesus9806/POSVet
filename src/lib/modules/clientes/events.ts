// Eventos emitidos por el módulo Clientes.

export const CLIENTE_EVENTS = {
  CREADO: "cliente.creado",
  ACTUALIZADO: "cliente.actualizado",
  DESACTIVADO: "cliente.desactivado",
} as const;

export type ClienteCreadoPayload = {
  clienteId: string;
  codigo: string;
  nombre: string;
  tipoCliente: "PUBLICO" | "MAYOREO" | "VETERINARIO" | "GRANJA";
  usuarioId: string;
};

export type ClienteActualizadoPayload = {
  clienteId: string;
  codigo: string;
  usuarioId: string;
};

export type ClienteDesactivadoPayload = {
  clienteId: string;
  codigo: string;
  usuarioId: string;
};
