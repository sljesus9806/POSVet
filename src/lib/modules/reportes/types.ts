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
    hora: number; // 0..23
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
