import type { NextAuthConfig } from "next-auth";

// Config edge-safe (sin DB, sin bcrypt). Se usa desde el middleware,
// que corre en Edge Runtime y no admite dependencias de Node como bcrypt.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 horas
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (nextUrl.pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", nextUrl),
        );
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
        token.nombre = (user as { nombre?: string }).nombre;
        token.empresaId = (user as { empresaId?: string }).empresaId;
        token.roles = (user as { roles?: string[] }).roles ?? [];
        token.permisos = (user as { permisos?: string[] }).permisos ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.nombre = token.nombre as string;
        session.user.empresaId = token.empresaId as string;
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.permisos = (token.permisos as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [], // se inyectan en src/auth.ts (no se pueden cargar en Edge)
} satisfies NextAuthConfig;
