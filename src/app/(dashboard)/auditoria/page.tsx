import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auditoriaService } from "@/lib/modules/auditoria";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmtFechaHora = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "medium" }).format(d);

const selectCls =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm";

type SearchParams = Promise<{
  modulo?: string;
  accion?: string;
  entidad?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  page?: string;
}>;

export default async function AuditoriaPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("auditoria:leer");
  const sp = await searchParams;

  const [pagina, opciones] = await Promise.all([
    auditoriaService.listar({
      modulo: sp.modulo,
      accion: sp.accion,
      entidad: sp.entidad,
      usuarioId: sp.usuarioId,
      desde: sp.desde,
      hasta: sp.hasta,
      page: sp.page,
    }),
    auditoriaService.opcionesFiltro(),
  ]);

  const qs = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({
      modulo: sp.modulo,
      accion: sp.accion,
      entidad: sp.entidad,
      usuarioId: sp.usuarioId,
      desde: sp.desde,
      hasta: sp.hasta,
    })) {
      if (v) p.set(k, v);
    }
    p.set("page", String(page));
    return `/auditoria?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bitácora de auditoría</h2>
        <p className="text-sm text-muted-foreground">
          Registro de acciones críticas: quién hizo qué y cuándo, con el antes/después.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="modulo">Módulo</Label>
          <select id="modulo" name="modulo" defaultValue={sp.modulo ?? ""} className={`${selectCls} min-w-[150px]`}>
            <option value="">Todos</option>
            {opciones.modulos.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="accion">Acción</Label>
          <select id="accion" name="accion" defaultValue={sp.accion ?? ""} className={`${selectCls} min-w-[150px]`}>
            <option value="">Todas</option>
            {opciones.acciones.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="entidad">Entidad</Label>
          <select id="entidad" name="entidad" defaultValue={sp.entidad ?? ""} className={`${selectCls} min-w-[140px]`}>
            <option value="">Todas</option>
            {opciones.entidades.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="usuarioId">Usuario</Label>
          <select id="usuarioId" name="usuarioId" defaultValue={sp.usuarioId ?? ""} className={`${selectCls} min-w-[160px]`}>
            <option value="">Todos</option>
            {opciones.usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" name="desde" type="date" defaultValue={sp.desde ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" name="hasta" type="date" defaultValue={sp.hasta ?? ""} />
        </div>
        <Button type="submit">Filtrar</Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/auditoria">Limpiar</Link>
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>ID</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagina.filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Sin registros para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              pagina.filas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums text-sm">{fmtFechaHora(r.fecha)}</TableCell>
                  <TableCell className="text-sm">{r.usuarioNombre ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.modulo}</TableCell>
                  <TableCell className="font-medium text-sm">{r.accion}</TableCell>
                  <TableCell className="text-sm">{r.entidad}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.entidadId ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/auditoria/${r.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap text-sm text-muted-foreground">
        <span>
          {pagina.total} registro{pagina.total === 1 ? "" : "s"} · página {pagina.page} de {pagina.totalPaginas}
        </span>
        <div className="flex gap-2">
          {pagina.page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={qs(pagina.page - 1)}>
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="size-4" /> Anterior
            </Button>
          )}
          {pagina.page < pagina.totalPaginas ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={qs(pagina.page + 1)}>
                Siguiente <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Siguiente <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
