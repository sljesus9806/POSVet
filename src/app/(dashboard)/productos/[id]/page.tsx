import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Layers } from "lucide-react";
import { categoriasService, productosService } from "@/lib/modules/productos";
import { inventarioService } from "@/lib/modules/inventario";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductoForm } from "../producto-form";
import { LoteForm } from "./lote-form";

type SearchParams = Promise<{ ok?: string }>;

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}

function diasHasta(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function ProductoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("productos:leer");
  const { id } = await params;
  const sp = await searchParams;

  const [producto, categorias, stockResumen, productos, costales] = await Promise.all([
    productosService.obtener(id),
    categoriasService.listar(),
    inventarioService.stockDeProducto(id),
    productosService.listar({ soloActivos: true }),
    productosService.costalesDeGranel(id),
  ]);
  if (!producto) notFound();

  // Candidatos a costal de origen (cualquier producto activo menos este mismo).
  const productosCostal = productos
    .filter((p) => p.id !== id)
    .map((p) => ({ id: p.id, nombre: p.nombre, sku: p.sku }));
  // Si algún costal apunta a este producto, este producto se vende a granel.
  const c = costales[0];
  const costalOrigen = c
    ? {
        id: c.id,
        nombre: c.nombre,
        contenido: c.contenido,
        unidadMedida: c.unidadMedida,
        stockCerrado: c.stockCerrado,
      }
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/productos">
              <ArrowLeft className="size-4" /> Volver a productos
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">{producto.nombre}</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span className="font-mono">{producto.sku}</span>
            <Badge variant="secondary">{producto.tipo}</Badge>
            {!producto.activo && <Badge variant="destructive">Inactivo</Badge>}
            {producto.requiereReceta && <Badge variant="outline">Receta</Badge>}
            {producto.sustanciaControlada && <Badge variant="outline">Controlada</Badge>}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/inventario/movimientos?productoId=${producto.id}`}>
            <History className="size-4" /> Ver kardex
          </Link>
        </Button>
      </div>

      {sp.ok === "creado" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Producto creado correctamente.
        </div>
      )}

      {stockResumen && (
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-muted-foreground" />
            <h3 className="font-semibold">Stock actual</h3>
            <span className="ml-auto text-sm text-muted-foreground">
              Total: <strong>{stockResumen.stockTotal} {producto.unidadMedida}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stockResumen.porUbicacion.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin inventario aún en ninguna ubicación.</p>
            )}
            {stockResumen.porUbicacion.map((u) => (
              <div key={u.ubicacionId} className="rounded-md border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.ubicacionNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Mínimo: {u.stockMinimo} {producto.unidadMedida}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">{u.stock}</p>
                  {u.stockMinimo > 0 && u.stock <= u.stockMinimo && (
                    <Badge variant="destructive" className="mt-1">Bajo stock</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProductoForm
        producto={producto}
        categorias={categorias}
        productosCostal={productosCostal}
        costalOrigen={costalOrigen}
        stockGranelAbierto={stockResumen?.stockTotal ?? 0}
      />

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Lotes</h3>
        {producto.lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin lotes registrados.</p>
        ) : (
          <ul className="text-sm divide-y">
            {producto.lotes.map((l) => {
              const dias = diasHasta(l.caducidad);
              return (
                <li key={l.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono">{l.lote}</span>
                    <span className="text-muted-foreground"> · Caduca {fmtFecha(l.caducidad)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{l.cantidad} {producto.unidadMedida}</span>
                    {dias < 0 ? (
                      <Badge variant="destructive">Caducado</Badge>
                    ) : dias <= 30 ? (
                      <Badge variant="destructive">{dias} días</Badge>
                    ) : dias <= 90 ? (
                      <Badge variant="outline">{dias} días</Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <LoteForm productoId={producto.id} />
      </section>
    </div>
  );
}
