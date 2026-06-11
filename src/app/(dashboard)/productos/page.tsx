import { prisma } from "@/lib/modules/shared/db";
import { productosService } from "@/lib/modules/productos";
import { inventarioService } from "@/lib/modules/inventario";
import { requirePermission, hasPermission } from "@/lib/auth-helpers";
import { ProductosScreen, type ProductoRow } from "./productos-screen";

type SearchParams = Promise<{ q?: string; tipo?: string }>;

export default async function ProductosPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("productos:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const tipo = sp.tipo && sp.tipo !== "TODOS" ? (sp.tipo as never) : undefined;

  const verInventario = hasPermission(user, "inventario:leer");
  const [productos, ubicaciones, alertasBajoStock, porCaducar] = await Promise.all([
    productosService.listar({ q, tipo }),
    prisma.ubicacion.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    verInventario ? inventarioService.alertasBajoStock() : Promise.resolve([]),
    verInventario ? inventarioService.alertasPorCaducar(30) : Promise.resolve([]),
  ]);

  const rows: ProductoRow[] = productos.map((p) => ({
    id: p.id,
    sku: p.sku,
    nombre: p.nombre,
    tipo: p.tipo,
    categoriaNombre: p.categoriaNombre,
    marca: p.marca,
    especie: p.especie,
    precioPublico: p.precioPublico,
    stockTotal: p.stockTotal,
    unidadMedida: p.unidadMedida,
    activo: p.activo,
  }));

  return (
    <ProductosScreen
      productos={rows}
      ubicaciones={ubicaciones}
      alertasBajoStock={alertasBajoStock.map((a) => ({
        productoId: a.productoId,
        sku: a.sku,
        nombre: a.nombre,
        ubicacionNombre: a.ubicacionNombre,
        stock: a.stock,
        stockMinimo: a.stockMinimo,
      }))}
      totalPorCaducar={porCaducar.length}
      q={q ?? ""}
      tipo={sp.tipo ?? "TODOS"}
      puedeInventario={hasPermission(user, "inventario:editar")}
      puedeEditar={hasPermission(user, "productos:editar")}
    />
  );
}
