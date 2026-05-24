import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  roles: string[];
  permisos: string[];
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

export function hasPermission(user: SessionUser, codigo: string): boolean {
  if (user.roles.includes("ADMIN")) return true;
  return user.permisos.includes(codigo);
}

export async function requirePermission(codigo: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, codigo)) redirect("/dashboard?error=sin_permiso");
  return user;
}
