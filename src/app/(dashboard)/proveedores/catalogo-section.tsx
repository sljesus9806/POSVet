"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, Plus, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  actualizarLineaCatalogoAction,
  agregarLineaCatalogoAction,
  eliminarLineaCatalogoAction,
  type FormState,
} from "./actions";
import type { CatalogoLinea } from "@/lib/modules/proveedores";

type ProductoOpcion = {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
};

const initial: FormState = { ok: false };

function SubmitIcon({ children, title }: { children: React.ReactNode; title?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="ghost" disabled={pending} title={title}>
      {children}
    </Button>
  );
}

function SubmitPrimary({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Agregando…" : label}
    </Button>
  );
}

export function CatalogoSection({
  proveedorId,
  lineas,
  productosDisponibles,
}: {
  proveedorId: string;
  lineas: CatalogoLinea[];
  productosDisponibles: ProductoOpcion[];
}) {
  const [addState, addAction] = useActionState(agregarLineaCatalogoAction, initial);
  const [mostrarForm, setMostrarForm] = useState(false);

  const yaEnCatalogo = new Set(lineas.map((l) => l.productoId));
  const disponibles = productosDisponibles.filter((p) => !yaEnCatalogo.has(p.id));

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Catálogo de productos</h3>
          <p className="text-xs text-muted-foreground">
            Productos que ofrece este proveedor, con su precio de costo. El producto preferido se usa por defecto en órdenes de compra.
          </p>
        </div>
        {!mostrarForm && disponibles.length > 0 && (
          <Button size="sm" onClick={() => setMostrarForm(true)} type="button">
            <Plus className="size-4" /> Agregar producto
          </Button>
        )}
      </div>

      {mostrarForm && (
        <form
          action={addAction}
          className="rounded-md border bg-muted/30 p-4 space-y-3"
        >
          <input type="hidden" name="proveedorId" value={proveedorId} />

          {addState.error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
              {addState.error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <Label htmlFor="productoId">Producto</Label>
              <select
                id="productoId"
                name="productoId"
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {disponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="codigoProveedor">Código del proveedor</Label>
              <Input id="codigoProveedor" name="codigoProveedor" placeholder="opcional" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="costoUnitario">Costo unitario</Label>
              <Input
                id="costoUnitario"
                name="costoUnitario"
                type="number"
                step="0.0001"
                min={0}
                defaultValue={0}
                required
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" name="esPreferido" className="size-4" />
                Preferido
              </label>
            </div>
            <div className="sm:col-span-12">
              <Label htmlFor="notas">Notas</Label>
              <Input id="notas" name="notas" placeholder="opcional" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarForm(false)}
            >
              Cancelar
            </Button>
            <SubmitPrimary label="Agregar al catálogo" />
          </div>
        </form>
      )}

      {disponibles.length === 0 && !mostrarForm && (
        <p className="text-xs text-muted-foreground">
          Todos los productos activos ya están en el catálogo de este proveedor.
        </p>
      )}

      {lineas.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
          Sin productos en el catálogo. Usa &ldquo;Agregar producto&rdquo; para empezar.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cód. proveedor</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Preferido</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l) => (
                <LineaRow key={l.id} linea={l} proveedorId={proveedorId} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function LineaRow({ linea, proveedorId }: { linea: CatalogoLinea; proveedorId: string }) {
  const [editState, editAction] = useActionState(actualizarLineaCatalogoAction, initial);
  const [delState, delAction] = useActionState(eliminarLineaCatalogoAction, initial);

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{linea.productoSku}</TableCell>
      <TableCell className="font-medium">
        {linea.productoNombre}
        <span className="text-xs text-muted-foreground ml-1">({linea.productoUnidadMedida})</span>
        {editState.error && (
          <div className="text-xs text-destructive mt-1">{editState.error}</div>
        )}
        {delState.error && (
          <div className="text-xs text-destructive mt-1">{delState.error}</div>
        )}
      </TableCell>
      <TableCell>
        <form action={editAction} className="flex items-center gap-1">
          <input type="hidden" name="lineaId" value={linea.id} />
          <input type="hidden" name="proveedorId" value={proveedorId} />
          <input type="hidden" name="costoUnitario" value={linea.costoUnitario} />
          <input
            type="hidden"
            name="esPreferido"
            value={linea.esPreferido ? "on" : ""}
          />
          <input type="hidden" name="notas" value={linea.notas ?? ""} />
          <Input
            name="codigoProveedor"
            defaultValue={linea.codigoProveedor ?? ""}
            placeholder="—"
            className="h-8 text-xs font-mono"
          />
          <SubmitIcon title="Guardar código">
            <Check className="size-4" />
          </SubmitIcon>
        </form>
      </TableCell>
      <TableCell className="text-right">
        <form action={editAction} className="flex items-center gap-1 justify-end">
          <input type="hidden" name="lineaId" value={linea.id} />
          <input type="hidden" name="proveedorId" value={proveedorId} />
          <input type="hidden" name="codigoProveedor" value={linea.codigoProveedor ?? ""} />
          <input
            type="hidden"
            name="esPreferido"
            value={linea.esPreferido ? "on" : ""}
          />
          <input type="hidden" name="notas" value={linea.notas ?? ""} />
          <Input
            name="costoUnitario"
            type="number"
            step="0.0001"
            min={0}
            defaultValue={linea.costoUnitario}
            className="h-8 text-xs w-24 text-right tabular-nums"
          />
          <SubmitIcon title="Guardar costo">
            <Check className="size-4" />
          </SubmitIcon>
        </form>
      </TableCell>
      <TableCell>
        <form action={editAction}>
          <input type="hidden" name="lineaId" value={linea.id} />
          <input type="hidden" name="proveedorId" value={proveedorId} />
          <input type="hidden" name="codigoProveedor" value={linea.codigoProveedor ?? ""} />
          <input type="hidden" name="costoUnitario" value={linea.costoUnitario} />
          <input type="hidden" name="notas" value={linea.notas ?? ""} />
          {/* invertir el estado actual */}
          <input
            type="hidden"
            name="esPreferido"
            value={linea.esPreferido ? "" : "on"}
          />
          <Button
            type="submit"
            size="sm"
            variant={linea.esPreferido ? "default" : "outline"}
            className="h-7"
          >
            <Star className={`size-3 ${linea.esPreferido ? "fill-current" : ""}`} />
            {linea.esPreferido ? "Sí" : "No"}
          </Button>
        </form>
      </TableCell>
      <TableCell className="text-right">
        <form action={delAction}>
          <input type="hidden" name="lineaId" value={linea.id} />
          <input type="hidden" name="proveedorId" value={proveedorId} />
          <SubmitIcon title="Eliminar del catálogo">
            <Trash2 className="size-4 text-destructive" />
          </SubmitIcon>
        </form>
      </TableCell>
    </TableRow>
  );
}

export function CatalogoBadgeCount({ count }: { count: number }) {
  return <Badge variant="secondary">{count}</Badge>;
}
