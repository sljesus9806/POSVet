import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoriasService } from "@/lib/modules/productos";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoriaForm } from "./categoria-form";

export default async function CategoriasPage() {
  await requirePermission("productos:leer");
  const categorias = await categoriasService.listar();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/productos">
            <ArrowLeft className="size-4" /> Volver a productos
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Categorías</h2>
      </div>

      <CategoriaForm />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay categorías todavía.
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.descripcion ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.productosCount}</TableCell>
                  <TableCell className="text-sm">{c.activa ? "Activa" : "Inactiva"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
