"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cerrarCajaAction, type FormState } from "../../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="default">
      {pending ? "Cerrando…" : "Cerrar caja"}
    </Button>
  );
}

export function CerrarCajaForm({
  cajaId,
  montoEsperadoEfectivo,
}: {
  cajaId: string;
  montoEsperadoEfectivo: number;
}) {
  const [state, action] = useActionState(cerrarCajaAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="bg-card border rounded-lg p-4 space-y-4">
      <input type="hidden" name="cajaId" value={cajaId} />
      <div>
        <h3 className="font-semibold">Cerrar caja</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Cuenta el efectivo físico y captúralo. La diferencia contra el esperado quedará
          registrada.
        </p>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="montoContadoEfectivo">
          Efectivo contado (esperado:{" "}
          <span className="tabular-nums font-mono">
            ${montoEsperadoEfectivo.toFixed(2)}
          </span>
          )
        </Label>
        <Input
          id="montoContadoEfectivo"
          name="montoContadoEfectivo"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={montoEsperadoEfectivo.toFixed(2)}
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
