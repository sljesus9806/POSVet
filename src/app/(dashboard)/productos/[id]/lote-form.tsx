"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearLoteAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="secondary">
      {pending ? "Guardando…" : "Agregar lote"}
    </Button>
  );
}

export function LoteForm({ productoId }: { productoId: string }) {
  const [state, action] = useActionState(crearLoteAction, initial);

  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end pt-3 border-t">
      <input type="hidden" name="productoId" value={productoId} />
      <div>
        <Label htmlFor="lote">Lote</Label>
        <Input id="lote" name="lote" required placeholder="L2026-XYZ" />
      </div>
      <div>
        <Label htmlFor="caducidad">Caducidad</Label>
        <Input id="caducidad" name="caducidad" type="date" required />
      </div>
      <div>
        <Label htmlFor="cantidad">Cantidad</Label>
        <Input id="cantidad" name="cantidad" type="number" step="0.001" min="0" required />
      </div>
      <div>
        <Label htmlFor="costoUnitario">Costo unitario</Label>
        <Input id="costoUnitario" name="costoUnitario" type="number" step="0.01" min="0" required />
      </div>
      <Submit />
      {state.error && (
        <p className="text-xs text-destructive sm:col-span-5">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-xs text-green-700 sm:col-span-5">Lote registrado.</p>
      )}
    </form>
  );
}
