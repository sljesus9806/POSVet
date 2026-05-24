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

export type CredencialesLogin = {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
};
