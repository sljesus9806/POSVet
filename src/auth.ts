import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import {
  usuariosService,
  loginSchema,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
} from "@/lib/modules/usuarios";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        try {
          const usuario = await usuariosService.autenticar({
            email: parsed.data.email,
            password: parsed.data.password,
          });

          return {
            id: usuario.id,
            email: usuario.email,
            name: usuario.nombre,
            nombre: usuario.nombre,
            empresaId: usuario.empresaId,
            roles: usuario.roles,
            permisos: usuario.permisos,
          };
        } catch (err) {
          if (
            err instanceof CredencialesInvalidasError ||
            err instanceof UsuarioBloqueadoError ||
            err instanceof UsuarioInactivoError
          ) {
            return null;
          }
          console.error("[auth] error autenticando:", err);
          return null;
        }
      },
    }),
  ],
});
