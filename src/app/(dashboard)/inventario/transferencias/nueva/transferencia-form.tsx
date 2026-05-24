"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { crearTransferenciaAction, type FormState } from "../../actions";

type Producto = { id: string; sku: string; nombre: string; unidadMedida: string };
type Ubicacion = { id: string; nombre: string; tipo: string };

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Procesando…" : "Confirmar transferencia"}
    </Button>
  );
}

type LineaTmp = { uid: number; productoId: string; cantidad: string };

export function TransferenciaForm({
  productos,
  ubicaciones,
}: {
  productos: Producto[];
  ubicaciones: Ubicacion[];
}) {
  const [state, action] = useActionState(crearTransferenciaAction, initial);
  const [lineas, setLineas] = useState<LineaTmp[]>([
    { uid: 1, productoId: "", cantidad: "" },
  ]);

  const agregar = () =>
    setLineas((curr) => [
      ...curr,
      { uid: Math.max(0, ...curr.map((l) => l.uid)) + 1, productoId: "", cantidad: "" },
    ]);
  const quitar = (uid: number) =>
    setLineas((curr) => (curr.length === 1 ? curr : curr.filter((l) => l.uid !== uid)));
  const setLinea = (uid: number, patch: Partial<LineaTmp>) =>
    setLineas((curr) => curr.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="space-y-5 rounded-lg border bg-card p-5">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="origenId">Origen</Label>
          <select
            id="origenId"
            name="origenId"
            required
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.tipo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="destinoId">Destino</Label>
          <select
            id="destinoId"
            name="destinoId"
            required
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.tipo})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Productos a transferir</Label>
          <Button type="button" variant="outline" size="sm" onClick={agregar}>
            <Plus className="size-4" /> Agregar línea
          </Button>
        </div>
        <div className="space-y-2">
          {lineas.map((l) => (
            <div key={l.uid} className="grid grid-cols-12 gap-2 items-center">
              <select
                name="productoId[]"
                required
                value={l.productoId}
                onChange={(e) => setLinea(l.uid, { productoId: e.target.value })}
                className="col-span-8 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Producto…
                </option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.nombre}
                  </option>
                ))}
              </select>
              <Input
                name="cantidad[]"
                type="number"
                step="0.001"
                min="0.001"
                required
                placeholder="Cantidad"
                value={l.cantidad}
                onChange={(e) => setLinea(l.uid, { cantidad: e.target.value })}
                className="col-span-3"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => quitar(l.uid)}
                disabled={lineas.length === 1}
                className="col-span-1"
                aria-label="Quitar línea"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Textarea id="observaciones" name="observaciones" rows={2} />
      </div>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
