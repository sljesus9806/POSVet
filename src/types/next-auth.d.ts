import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      nombre: string;
      empresaId: string;
      roles: string[];
      permisos: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    nombre?: string;
    empresaId?: string;
    roles?: string[];
    permisos?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    nombre?: string;
    empresaId?: string;
    roles?: string[];
    permisos?: string[];
  }
}
