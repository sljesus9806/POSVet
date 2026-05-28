import Link from "next/link";
import { Plus } from "lucide-react";
import { proveedoresService } from "@/lib/modules/proveedores";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchParams = Promise<{ q?: string; soloActivos?: string }>;

export default async function ProveedoresPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("proveedores:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const soloActivos = sp.soloActivos !== "no";
  const proveedores = await proveedoresService.listar({ q, soloActivos });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Proveedores</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo de proveedores con datos fiscales y productos que ofrecen.
          </p>
        </div>
        <Button asChild>
          <Link href="/proveedores/nuevo">
            <Plus className="size-4" /> Nuevo proveedor
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Código, nombre, RFC, contacto, email…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm pb-1">
          <input
            type="checkbox"
            name="soloActivos"
            value="no"
            defaultChecked={!soloActivos}
            className="size-4"
          />
          Incluir inactivos
        </label>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right"># Productos</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Sin proveedores. Crea uno con &ldquo;Nuevo proveedor&rdquo;.
                </TableCell>
              </TableRow>
            ) : (
              proveedores.map((p) => (
                <TableRow key={p.id} className={p.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {p.nombre}
                    {!p.activo && <Badge variant="outline" className="ml-2">Inactivo</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.rfc ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.contacto ?? "—"}
                    {p.email && <div className="text-xs">{p.email}</div>}
                    {p.telefono && <div className="text-xs">{p.telefono}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.numProductos}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/proveedores/${p.id}`}>Ver</Link>
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
