"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actualizarProductoAction, crearProductoAction, type FormState } from "./actions";
import type { ProductoDetalle, CategoriaListado } from "@/lib/modules/productos";

const initial: FormState = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

type Props = {
  categorias: CategoriaListado[];
  producto?: ProductoDetalle;
};

export function ProductoForm({ categorias, producto }: Props) {
  const isEdit = !!producto;
  const action = isEdit ? actualizarProductoAction : crearProductoAction;
  const [state, formAction] = useActionState(action, initial);

  const precio = (tipo: "PUBLICO" | "MAYOREO" | "VETERINARIO") =>
    producto?.precios.find((p) => p.tipo === tipo)?.precio ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={producto!.id} />}

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Producto guardado correctamente.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Identificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={producto?.sku} required placeholder="MED-AMOX-500" />
            <Err msgs={state.fieldErrors?.sku} />
          </div>
          <div>
            <Label htmlFor="codigoBarras">Código de barras</Label>
            <Input id="codigoBarras" name="codigoBarras" defaultValue={producto?.codigoBarras ?? ""} />
            <Err msgs={state.fieldErrors?.codigoBarras} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={producto?.nombre} required />
            <Err msgs={state.fieldErrors?.nombre} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion ?? ""} rows={2} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Clasificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={producto?.tipo ?? "MEDICAMENTO"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="MEDICAMENTO">Medicamento</option>
              <option value="ALIMENTO">Alimento</option>
              <option value="ACCESORIO">Accesorio</option>
              <option value="SERVICIO">Servicio</option>
            </select>
          </div>
          <div>
            <Label htmlFor="categoriaId">Categoría</Label>
            <select
              id="categoriaId"
              name="categoriaId"
              defaultValue={producto?.categoriaId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="unidadMedida">Unidad de medida</Label>
            <Input id="unidadMedida" name="unidadMedida" defaultValue={producto?.unidadMedida ?? "PZA"} required />
          </div>
          <div>
            <Label htmlFor="especie">Especie</Label>
            <Input id="especie" name="especie" defaultValue={producto?.especie ?? ""} placeholder="Canino, Felino…" />
          </div>
          <div>
            <Label htmlFor="marca">Marca</Label>
            <Input id="marca" name="marca" defaultValue={producto?.marca ?? ""} />
          </div>
          <div>
            <Label htmlFor="laboratorio">Laboratorio</Label>
            <Input id="laboratorio" name="laboratorio" defaultValue={producto?.laboratorio ?? ""} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiereReceta"
              defaultChecked={producto?.requiereReceta ?? false}
              className="size-4"
            />
            Requiere receta médica
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="sustanciaControlada"
              defaultChecked={producto?.sustanciaControlada ?? false}
              className="size-4"
            />
            Sustancia controlada (COFEPRIS)
          </label>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="activo"
                defaultChecked={producto?.activo ?? true}
                className="size-4"
              />
              Activo
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="viaAdministracion">Vía de administración</Label>
            <Input
              id="viaAdministracion"
              name="viaAdministracion"
              defaultValue={producto?.viaAdministracion ?? ""}
              placeholder="Oral, inyectable, tópica…"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Fiscal y costos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="claveSAT">Clave SAT</Label>
            <Input id="claveSAT" name="claveSAT" defaultValue={producto?.claveSAT ?? "01010101"} />
          </div>
          <div>
            <Label htmlFor="ivaAplicable">IVA (0.00 – 1.00)</Label>
            <Input
              id="ivaAplicable"
              name="ivaAplicable"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={producto?.ivaAplicable ?? 0.16}
            />
          </div>
          <div>
            <Label htmlFor="ultimoCosto">Último costo (MXN)</Label>
            <Input
              id="ultimoCosto"
              name="ultimoCosto"
              type="number"
              step="0.01"
              min="0"
              defaultValue={producto?.ultimoCosto ?? 0}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Precios de venta</h3>
        <p className="text-xs text-muted-foreground">
          Deja en blanco los que no apliquen. PUBLICO es el precio default mostrado en el listado.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["PUBLICO", "MAYOREO", "VETERINARIO"] as const).map((tipo) => (
            <div key={tipo}>
              <Label htmlFor={`precio_${tipo}`}>{tipo}</Label>
              <Input
                id={`precio_${tipo}`}
                name={`precio_${tipo}`}
                type="number"
                step="0.01"
                min="0"
                defaultValue={precio(tipo)}
              />
            </div>
          ))}
        </div>
        {state.fieldErrors?.precios && (
          <Err msgs={state.fieldErrors.precios as unknown as string[]} />
        )}
      </section>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href="/productos">Cancelar</Link>
        </Button>
        <Submit label={isEdit ? "Guardar cambios" : "Crear producto"} />
      </div>
    </form>
  );
}
