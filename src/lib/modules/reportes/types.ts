export type RangoFechas = {
  desde: Date;
  hasta: Date;
};

export type VentasDelDiaReporte = {
  rango: RangoFechas;
  ubicacionId: string | null;
  ubicacionNombre: string | null;
  totalVendido: number;
  numTickets: number;
  ticketPromedio: number;
  totalCancelado: number;
  numTicketsCancelados: number;
  porHora: Array<{
    hora: number;
    numTickets: number;
    total: number;
  }>;
  porFormaPago: Array<{
    forma: string;
    monto: number;
  }>;
};

export type ProductosVendidosFila = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  categoria: string | null;
  cantidad: number;
  montoTotal: number;
};

export type ProductosVendidosReporte = {
  rango: RangoFechas;
  ubicacionId: string | null;
  ubicacionNombre: string | null;
  filas: ProductosVendidosFila[];
  totalCantidad: number;
  totalMonto: number;
};

export type VentasPorUsuarioFila = {
  usuarioId: string;
  usuarioNombre: string;
  numTickets: number;
  total: number;
  ticketPromedio: number;
};

export type VentasPorUsuarioReporte = {
  rango: RangoFechas;
  ubicacionId: string | null;
  ubicacionNombre: string | null;
  filas: VentasPorUsuarioFila[];
  totalGeneral: number;
  numTicketsGeneral: number;
};

// ===== Inventario actual valorizado =====
export type InventarioActualFila = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  categoria: string | null;
  ubicacionId: string;
  ubicacionNombre: string;
  stock: number;
  costoUnitario: number;
  precioVenta: number;
  valorCosto: number;
  valorVenta: number;
};

export type InventarioActualPorCategoria = {
  categoria: string;
  valorCosto: number;
  valorVenta: number;
};

export type InventarioActualReporte = {
  ubicacionId: string | null;
  ubicacionNombre: string | null;
  categoriaId: string | null;
  categoriaNombre: string | null;
  soloConStock: boolean;
  filas: InventarioActualFila[];
  totalCosto: number;
  totalVenta: number;
  margenPotencial: number; // venta - costo
  porCategoria: InventarioActualPorCategoria[];
};

// ===== Productos por caducar =====
export type CaducidadBucket = "vencidos" | "0-30" | "31-60" | "61-90" | "mas-90";

export type ProductoPorCaducarFila = {
  loteId: string;
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  lote: string;
  caducidad: Date;
  diasParaCaducar: number; // negativo si ya venció
  cantidad: number;
  costoUnitario: number;
  bucket: CaducidadBucket;
};

export type ProductosPorCaducarReporte = {
  diasUmbral: number;
  filas: ProductoPorCaducarFila[];
  porBucket: Array<{
    bucket: CaducidadBucket;
    label: string;
    numLotes: number;
    cantidad: number;
    valorCosto: number;
  }>;
  totalLotes: number;
  totalCantidad: number;
  totalValorCosto: number;
};

// ===== Antigüedad de saldos =====
export type AntiguedadBucket = "0-30" | "31-60" | "61-90" | "mas-90";

export type AntiguedadCxCFila = {
  clienteId: string;
  clienteCodigo: string;
  clienteNombre: string;
  numDocumentos: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucketMas90: number;
  total: number;
};

export type AntiguedadCxPFila = {
  proveedorId: string;
  proveedorCodigo: string;
  proveedorNombre: string;
  numDocumentos: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucketMas90: number;
  total: number;
};

export type AntiguedadSaldosReporte<T = AntiguedadCxCFila | AntiguedadCxPFila> = {
  fechaCorte: Date;
  filas: T[];
  totalGeneral: number;
  totalBucket0_30: number;
  totalBucket31_60: number;
  totalBucket61_90: number;
  totalBucketMas90: number;
};

// ===== Productos sin movimiento =====
export type ProductoSinMovimientoFila = {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  categoria: string | null;
  ultimaVenta: Date | null;
  diasSinVenta: number; // 999999 si nunca se ha vendido
  stockTotal: number;
  valorCosto: number;
};

export type ProductosSinMovimientoReporte = {
  fechaCorte: Date;
  diasUmbral: number;
  categoriaId: string | null;
  categoriaNombre: string | null;
  soloConStock: boolean;
  filas: ProductoSinMovimientoFila[];
  totalProductos: number;
  totalValorCosto: number;
};

// ===== Corte de caja =====
export type CorteCajaFila = {
  id: string;
  folio: string;
  estado: "ABIERTA" | "CERRADA";
  ubicacionNombre: string;
  abiertaPorNombre: string;
  cerradaPorNombre: string | null;
  abiertaEn: Date;
  cerradaEn: Date | null;
  fondoInicial: number;
  totalVendido: number;
  numVentas: number;
  efectivoEsperado: number | null; // null mientras la caja siga abierta
  montoContado: number | null;
  diferencia: number | null;
};

export type CorteCajasReporte = {
  rango: RangoFechas;
  ubicacionId: string | null;
  ubicacionNombre: string | null;
  filas: CorteCajaFila[];
  numCajas: number;
  totalFondo: number;
  totalVendido: number;
  totalContado: number;
  totalDiferencia: number;
};
