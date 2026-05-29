"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearUbicacionAction, type FormState } from "./actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Agregar ubicación"}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

export function UbicacionNuevaForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(crearUbicacionAction, initial);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Nueva ubicación
      </Button>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Nueva ubicación</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="-mr-2"
        >
          <X className="size-4" />
        </Button>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-xs px-3 py-2">
          ✓ Ubicación agregada. Puedes agregar otra o cerrar.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="nuevo-nombre">Nombre</Label>
          <Input id="nuevo-nombre" name="nombre" required placeholder="Sucursal Norte" />
          <Err msgs={state.fieldErrors?.nombre} />
        </div>
        <div>
          <Label htmlFor="nuevo-tipo">Tipo</Label>
          <select
            id="nuevo-tipo"
            name="tipo"
            defaultValue="TIENDA"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="TIENDA">Tienda</option>
            <option value="BODEGA">Bodega</option>
            <option value="SUCURSAL">Sucursal</option>
          </select>
        </div>
        <div>
          <Label htmlFor="nuevo-direccion">Dirección (opcional)</Label>
          <Input id="nuevo-direccion" name="direccion" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Submit />
      </div>
    </form>
  );
}
