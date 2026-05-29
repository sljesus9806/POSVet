import Link from "next/link";
import { Plus } from "lucide-react";
import { usuariosService, type RolCodigo } from "@/lib/modules/usuarios";
import { requirePermission } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchParams = Promise<{ q?: string; soloActivos?: string; rol?: string }>;

const ROL_LABEL: Record<RolCodigo, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  CAJERO: "Cajero",
  ALMACENISTA: "Almacenista",
  READONLY: "Solo lectura",
};

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("usuarios:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const soloActivos = sp.soloActivos !== "no";
  const rolCodigo = (sp.rol as RolCodigo | undefined) || undefined;

  const usuarios = await usuariosService.listar({
    empresaId: user.empresaId,
    q,
    soloActivos,
    rolCodigo,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Personal con acceso al sistema y los roles que pueden ejercer.
          </p>
        </div>
        <Button asChild>
          <Link href="/usuarios/nuevo">
            <Plus className="size-4" /> Nuevo usuario
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input name="q" defaultValue={q ?? ""} placeholder="Nombre o correo…" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rol</label>
          <select
            name="rol"
            defaultValue={rolCodigo ?? ""}
            className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Todos</option>
            {(Object.keys(ROL_LABEL) as RolCodigo[]).map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="soloActivos"
            value="no"
            defaultChecked={!soloActivos}
            className="size-4"
          />
          Mostrar inactivos
        </label>
        <Button type="submit" variant="outline" size="sm">
          Aplicar
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No hay usuarios{q ? ` que coincidan con "${q}"` : ""}.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline">
                          {ROL_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!u.activo ? (
                      <Badge variant="secondary">Inactivo</Badge>
                    ) : u.bloqueado ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge>Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtFecha(u.ultimoLoginAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/usuarios/${u.id}`}>Abrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
