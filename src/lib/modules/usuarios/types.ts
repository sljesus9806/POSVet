export type RolCodigo =
  | "ADMIN"
  | "SUPERVISOR"
  | "CAJERO"
  | "ALMACENISTA"
  | "READONLY";

export type UsuarioPublico = {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  activo: boolean;
  roles: RolCodigo[];
  permisos: string[]; // formato "modulo:accion"
};

export type UsuarioListado = {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  bloqueado: boolean;
  ultimoLoginAt: Date | null;
  roles: RolCodigo[];
};

export type UsuarioDetalle = {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  activo: boolean;
  bloqueado: boolean;
  bloqueadoHasta: Date | null;
  intentosFallidos: number;
  ultimoLoginAt: Date | null;
  roles: RolCodigo[];
  createdAt: Date;
  updatedAt: Date;
};

export type RolDisponible = {
  codigo: RolCodigo;
  nombre: string;
  descripcion: string | null;
};

export type CredencialesLogin = {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
};
