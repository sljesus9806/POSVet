"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desbloquearUsuarioAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <Unlock className="size-4" /> {pending ? "Desbloqueando…" : "Desbloquear ahora"}
    </Button>
  );
}

export function DesbloquearForm({ usuarioId }: { usuarioId: string }) {
  const [state, formAction] = useActionState(desbloquearUsuarioAction, initial);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={usuarioId} />
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-xs px-3 py-2">
          ✓ Usuario desbloqueado.
        </div>
      )}
      <Submit />
    </form>
  );
}
