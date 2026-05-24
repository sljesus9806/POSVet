"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearCategoriaAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Crear categoría"}
    </Button>
  );
}

export function CategoriaForm() {
  const [state, action] = useActionState(crearCategoriaAction, initial);

  return (
    <form action={action} className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-semibold">Nueva categoría</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div>
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <Input id="descripcion" name="descripcion" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Submit />
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        {state.ok && <p className="text-xs text-green-700">Categoría creada.</p>}
      </div>
    </form>
  );
}
