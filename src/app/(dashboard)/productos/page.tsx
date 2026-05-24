import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { productosService } from "@/lib/modules/productos";
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

const TIPOS = ["TODOS", "MEDICAMENTO", "ALIMENTO", "ACCESORIO", "SERVICIO"] as const;

type SearchParams = Promise<{ q?: string; tipo?: string }>;

function fmtMoneda(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

export default async function ProductosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("productos:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const tipo = sp.tipo && sp.tipo !== "TODOS" ? (sp.tipo as never) : undefined;
  const productos = await productosService.listar({ q, tipo });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Productos</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo de productos: medicamentos, alimentos, accesorios y servicios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/productos/categorias">
              <Tag className="size-4" /> Categorías
            </Link>
          </Button>
          <Button asChild>
            <Link href="/productos/nuevo">
              <Plus className="size-4" /> Nuevo producto
            </Link>
          </Button>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="SKU, nombre, marca, código de barras…"
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
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Marca / Especie</TableHead>
              <TableHead className="text-right">Precio público</TableHead>
              <TableHead className="text-right">Stock total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin productos. Crea uno con “Nuevo producto”.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id} className={p.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.categoriaNombre ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {[p.marca, p.especie].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoneda(p.precioPublico)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.stockTotal} {p.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/productos/${p.id}`}>Ver</Link>
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
