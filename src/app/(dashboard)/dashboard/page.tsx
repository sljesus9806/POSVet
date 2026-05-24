import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardHome() {
  const session = await auth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Hola, {session?.user.nombre}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Sistema de Punto de Venta — Fase 1 (MVP) en construcción.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tu sesión</CardTitle>
          <CardDescription>
            Datos cargados desde el token JWT del módulo de autenticación.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Correo</p>
            <p className="font-medium">{session?.user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Empresa</p>
            <p className="font-mono text-xs">{session?.user.empresaId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Roles</p>
            <p className="font-medium">
              {session?.user.roles?.join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Permisos</p>
            <p className="font-medium">
              {session?.user.permisos?.length ?? 0} permisos asignados
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Siguiente módulo</CardTitle>
          <CardDescription>
            Productos e Inventario (catálogo + ubicaciones) — se desarrollará
            en su propia branch <code>feature/productos-inventario</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
