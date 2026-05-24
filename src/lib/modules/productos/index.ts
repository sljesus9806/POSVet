// API pública del módulo Productos.
// Otros módulos SOLO deben importar desde este archivo.

export {
  productosService,
  categoriasService,
  SkuDuplicadoError,
  CodigoBarrasDuplicadoError,
  ProductoNoEncontradoError,
  CategoriaDuplicadaError,
} from "./service";

export {
  crearProductoSchema,
  actualizarProductoSchema,
  crearCategoriaSchema,
  actualizarCategoriaSchema,
  crearLoteSchema,
  tipoProductoSchema,
  tipoPrecioSchema,
} from "./schemas";

export type {
  CrearProductoInput,
  ActualizarProductoInput,
  CrearCategoriaInput,
  ActualizarCategoriaInput,
  CrearLoteInput,
} from "./schemas";

export type {
  ProductoListado,
  ProductoDetalle,
  CategoriaListado,
  PrecioInfo,
  LoteInfo,
  TipoProducto,
  TipoPrecio,
} from "./types";

export {
  PRODUCTO_EVENTS,
  type ProductoCreadoPayload,
  type ProductoActualizadoPayload,
  type ProductoDesactivadoPayload,
  type LoteCreadoPayload,
} from "./events";
