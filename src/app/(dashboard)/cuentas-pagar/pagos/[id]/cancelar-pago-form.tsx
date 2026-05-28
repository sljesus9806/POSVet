"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelarPagoAction, type FormState } from "../../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cancelando…" : "Confirmar cancelación"}
    </Button>
  );
}

export function CancelarPagoForm({ pagoId, folio }: { pagoId: string; folio: string }) {
  const [state, action] = useActionState(cancelarPagoAction, initial);
  const [mostrar, setMostrar] = useState(false);

  if (!mostrar) {
    return (
      <Button variant="outline" type="button" onClick={() => setMostrar(true)}>
        <Ban className="size-4" /> Cancelar pago
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-md border bg-muted/30 p-4 space-y-3">
      <input type="hidden" name="pagoId" value={pagoId} />
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="motivo">Motivo de cancelación de {folio}</Label>
        <Input id="motivo" name="motivo" required minLength={3} placeholder="Ej: cheque devuelto" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setMostrar(false)}>
          No, regresar
        </Button>
        <Submit />
      </div>
    </form>
  );
}
