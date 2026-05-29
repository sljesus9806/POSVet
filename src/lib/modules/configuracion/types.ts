import type { TipoUbicacion } from "@prisma/client";

export type EmpresaDetalle = {
  id: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string | null;
  codigoPostal: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  logoUrl: string | null;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UbicacionListado = {
  id: string;
  nombre: string;
  tipo: TipoUbicacion;
  direccion: string | null;
  activa: boolean;
  numInventarios: number;
};

export type UbicacionDetalle = {
  id: string;
  empresaId: string;
  nombre: string;
  tipo: TipoUbicacion;
  direccion: string | null;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
};
