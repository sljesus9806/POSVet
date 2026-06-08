"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOTIVOS_CANCELACION } from "@/lib/modules/facturacion/catalogos";
import { cancelarFacturaAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cancelando…" : "Cancelar factura"}
    </Button>
  );
}

export function CancelarFacturaForm({ facturaId }: { facturaId: string }) {
  const [state, action] = useActionState(cancelarFacturaAction, initial);
  const [motivo, setMotivo] = useState("02");
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="facturaId" value={facturaId} />
      <p className="text-xs text-muted-foreground">
        Cancelar un CFDI lo anula ante el SAT. Esta acción no se puede deshacer.
      </p>
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-2 py-1">
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="motivo" className="text-xs">
          Motivo de cancelación (SAT)
        </Label>
        <select
          id="motivo"
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {MOTIVOS_CANCELACION.map((m) => (
            <option key={m.clave} value={m.clave}>
              {m.descripcion}
            </option>
          ))}
        </select>
      </div>
      {motivo === "01" && (
        <div>
          <Label htmlFor="folioSustitucion" className="text-xs">
            UUID de la factura que la sustituye
          </Label>
          <Input
            id="folioSustitucion"
            name="folioSustitucion"
            placeholder="UUID del CFDI nuevo"
            className="font-mono"
          />
          {state.fieldErrors?.folioSustitucion && (
            <p className="text-xs text-destructive mt-1">
              {state.fieldErrors.folioSustitucion.join(" · ")}
            </p>
          )}
        </div>
      )}
      <Submit />
    </form>
  );
}
