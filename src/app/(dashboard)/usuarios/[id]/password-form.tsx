"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarPasswordAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Actualizando…" : "Cambiar contraseña"}
    </Button>
  );
}

export function PasswordForm({ usuarioId }: { usuarioId: string }) {
  const [state, formAction] = useActionState(cambiarPasswordAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={usuarioId} />

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          ✓ Contraseña actualizada. El usuario debe iniciar sesión con la nueva.
        </div>
      )}

      <div>
        <Label htmlFor="nuevaPassword">Nueva contraseña</Label>
        <Input
          id="nuevaPassword"
          name="nuevaPassword"
          type="password"
          required
          minLength={10}
          placeholder="Mínimo 10 caracteres"
        />
        {state.fieldErrors?.nuevaPassword && (
          <p className="text-xs text-destructive mt-1">
            {state.fieldErrors.nuevaPassword.join(" · ")}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Al cambiarla también se reinician los intentos fallidos y se desbloquea la cuenta.
        </p>
      </div>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
