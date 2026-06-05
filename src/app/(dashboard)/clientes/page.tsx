import Link from "next/link";
import { Plus } from "lucide-react";
import { clientesService } from "@/lib/modules/clientes";
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

const TIPOS = ["TODOS", "PUBLICO", "MAYOREO", "DISTRIBUIDOR"] as const;

type SearchParams = Promise<{ q?: string; tipo?: string; soloActivos?: string }>;

export default async function ClientesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("clientes:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const tipo = sp.tipo && sp.tipo !== "TODOS" ? (sp.tipo as never) : undefined;
  const soloActivos = sp.soloActivos !== "no";
  const clientes = await clientesService.listar({ q, tipo, soloActivos });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo de clientes con datos fiscales para CFDI.
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/nuevo">
            <Plus className="size-4" /> Nuevo cliente
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Código, nombre, RFC, email…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            name="tipo"
            defaultValue={sp.tipo ?? "TODOS"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
              <TableHead>Tipo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Sin clientes. Crea uno con “Nuevo cliente”.
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => (
                <TableRow key={c.id} className={c.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {c.nombre}
                    {!c.activo && <Badge variant="outline" className="ml-2">Inactivo</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.tipoCliente}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.tipoPrecioEfectivo}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.rfc ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[c.email, c.telefono].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/clientes/${c.id}`}>Ver</Link>
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
