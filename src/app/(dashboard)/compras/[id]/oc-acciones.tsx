"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelarOrdenCompraAction,
  enviarOrdenCompraAction,
  type FormState,
} from "../actions";

const initial: FormState = { ok: false };

function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
  icon,
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {icon}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function OcAcciones({
  ordenCompraId,
  folio,
  puedeEnviar,
  puedeCancelar,
}: {
  ordenCompraId: string;
  folio: string;
  puedeEnviar: boolean;
  puedeCancelar: boolean;
}) {
  const [envState, envAction] = useActionState(enviarOrdenCompraAction, initial);
  const [canState, canAction] = useActionState(cancelarOrdenCompraAction, initial);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);

  if (!puedeEnviar && !puedeCancelar) return null;

  return (
    <section className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-semibold">Acciones</h3>
      {(envState.error || canState.error) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {envState.error ?? canState.error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {puedeEnviar && (
          <form action={envAction}>
            <input type="hidden" name="ordenCompraId" value={ordenCompraId} />
            <SubmitButton
              label="Marcar como enviada"
              pendingLabel="Enviando…"
              icon={<Send className="size-4" />}
            />
          </form>
        )}
        {puedeCancelar && !mostrarCancelar && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setMostrarCancelar(true)}
          >
            <Ban className="size-4" /> Cancelar OC
          </Button>
        )}
      </div>

      {mostrarCancelar && (
        <form action={canAction} className="rounded-md border bg-muted/30 p-4 space-y-3">
          <input type="hidden" name="ordenCompraId" value={ordenCompraId} />
          <div>
            <Label htmlFor="motivo">Motivo de cancelación de {folio}</Label>
            <Input
              id="motivo"
              name="motivo"
              required
              minLength={3}
              placeholder="Ej: proveedor no surtió"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarCancelar(false)}
            >
              No, regresar
            </Button>
            <SubmitButton
              label="Confirmar cancelación"
              pendingLabel="Cancelando…"
              variant="destructive"
            />
          </div>
        </form>
      )}
    </section>
  );
}
