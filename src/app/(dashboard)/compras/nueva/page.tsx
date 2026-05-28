import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { proveedoresService } from "@/lib/modules/proveedores";
import { comprasService } from "@/lib/modules/compras";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { NuevaOcForm } from "./nueva-oc-form";

type SearchParams = Promise<{ proveedorId?: string }>;

export default async function NuevaCompraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("compras:crear");
  const sp = await searchParams;
  const proveedorIdInicial = sp.proveedorId || null;

  const [proveedores, ubicaciones] = await Promise.all([
    proveedoresService.listar({ soloActivos: true }),
    prisma.ubicacion.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, tipo: true },
    }),
  ]);

  const sugerencias = proveedorIdInicial
    ? await comprasService.sugerenciasDeProveedor(proveedorIdInicial)
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/compras">
            <ArrowLeft className="size-4" /> Volver a compras
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nueva orden de compra</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona proveedor y destino, luego agrega líneas. Al cambiar de proveedor se cargan
          los productos de su catálogo con precio y código sugeridos.
        </p>
      </div>
      <NuevaOcForm
        proveedores={proveedores.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre }))}
        ubicaciones={ubicaciones}
        proveedorIdInicial={proveedorIdInicial}
        sugerenciasIniciales={sugerencias}
      />
    </div>
  );
}
