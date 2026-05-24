"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ajustarStockAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Aplicando…" : "Aplicar ajuste"}
    </Button>
  );
}

type Producto = { id: string; sku: string; nombre: string; unidadMedida: string };
type Ubicacion = { id: string; nombre: string; tipo: string };

export function AjusteForm({ productos, ubicaciones }: { productos: Producto[]; ubicaciones: Ubicacion[] }) {
  const [state, action] = useActionState(ajustarStockAction, initial);

  return (
    <form action={action} className="space-y-5 rounded-lg border bg-card p-5">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Ajuste registrado correctamente.
        </div>
      )}

      <div>
        <Label htmlFor="productoId">Producto</Label>
        <select
          id="productoId"
          name="productoId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="ubicacionId">Ubicación</Label>
        <select
          id="ubicacionId"
          name="ubicacionId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue=""
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tipoMovimiento">Tipo</Label>
          <select
            id="tipoMovimiento"
            name="tipoMovimiento"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="SALIDA"
          >
            <option value="ENTRADA">Entrada (+)</option>
            <option value="SALIDA">Salida (−)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input id="cantidad" name="cantidad" type="number" step="0.001" min="0.001" required />
        </div>
      </div>

      <div>
        <Label htmlFor="motivo">Motivo</Label>
        <select
          id="motivo"
          name="motivo"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue="AJUSTE_CONTEO"
        >
          <option value="AJUSTE_MERMA">Merma</option>
          <option value="AJUSTE_CADUCIDAD">Caducidad</option>
          <option value="AJUSTE_ROBO">Robo / extravío</option>
          <option value="AJUSTE_CONTEO">Conteo físico</option>
        </select>
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
