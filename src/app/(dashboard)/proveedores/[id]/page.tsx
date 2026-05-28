import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { proveedoresService } from "@/lib/modules/proveedores";
import { productosService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProveedorForm } from "../proveedor-form";
import { CatalogoSection } from "../catalogo-section";

type SearchParams = Promise<{ ok?: string }>;

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function ProveedorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("proveedores:leer");
  const { id } = await params;
  const sp = await searchParams;

  const proveedor = await proveedoresService.obtener(id);
  if (!proveedor) notFound();

  const [catalogo, productos] = await Promise.all([
    proveedoresService.listarCatalogo(id),
    productosService.listar({ soloActivos: true }),
  ]);

  const productosDisponibles = productos.map((p) => ({
    id: p.id,
    sku: p.sku,
    nombre: p.nombre,
    unidadMedida: p.unidadMedida,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/proveedores">
            <ArrowLeft className="size-4" /> Volver a proveedores
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{proveedor.nombre}</h2>
          <span className="font-mono text-sm text-muted-foreground">{proveedor.codigo}</span>
          {!proveedor.activo && <Badge variant="destructive">Inactivo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Alta {fmtFecha(proveedor.createdAt)} · última edición {fmtFecha(proveedor.updatedAt)}
        </p>
      </div>

      {sp.ok === "creado" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Proveedor creado correctamente con código <strong>{proveedor.codigo}</strong>.
        </div>
      )}

      <CatalogoSection
        proveedorId={proveedor.id}
        lineas={catalogo}
        productosDisponibles={productosDisponibles}
      />

      <ProveedorForm proveedor={proveedor} />
    </div>
  );
}
