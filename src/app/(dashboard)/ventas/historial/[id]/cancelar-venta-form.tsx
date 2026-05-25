"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelarVentaAction, type FormState } from "../../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cancelando…" : "Cancelar venta"}
    </Button>
  );
}

export function CancelarVentaForm({ ventaId }: { ventaId: string }) {
  const [state, action] = useActionState(cancelarVentaAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ventaId" value={ventaId} />
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-2 py-1">
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="motivo" className="text-xs">
          Motivo de cancelación
        </Label>
        <Textarea id="motivo" name="motivo" rows={2} required minLength={3} maxLength={300} />
      </div>
      <Submit />
    </form>
  );
}
