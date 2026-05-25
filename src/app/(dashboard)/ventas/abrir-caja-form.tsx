"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { abrirCajaAction, type FormState } from "./actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Abriendo…" : "Abrir caja"}
    </Button>
  );
}

type Ubicacion = { id: string; nombre: string; tipo: string };

export function AbrirCajaForm({ ubicaciones }: { ubicaciones: Ubicacion[] }) {
  const [state, action] = useActionState(abrirCajaAction, initial);

  return (
    <form action={action} className="space-y-5 rounded-lg border bg-card p-5">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="ubicacionId">Ubicación</Label>
        <select
          id="ubicacionId"
          name="ubicacionId"
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
        <Label htmlFor="fondoInicial">Fondo inicial (efectivo)</Label>
        <Input
          id="fondoInicial"
          name="fondoInicial"
          type="number"
          step="0.01"
          min="0"
          defaultValue={0}
          required
        />
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
