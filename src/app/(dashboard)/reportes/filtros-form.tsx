import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Ubicacion = { id: string; nombre: string };

// Server-renderable form. Navega a la misma ruta con los searchParams.
// Mantiene la pantalla server-side para que el reporte se re-genere en el servidor.
export function FiltrosForm({
  action,
  desde,
  hasta,
  ubicacionId,
  ubicaciones,
}: {
  action: string;
  desde: string; // yyyy-mm-dd
  hasta: string; // yyyy-mm-dd
  ubicacionId?: string;
  ubicaciones: Ubicacion[];
}) {
  return (
    <form
      action={action}
      method="get"
      className="no-print flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="desde">Desde</Label>
        <Input id="desde" name="desde" type="date" defaultValue={desde} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hasta">Hasta</Label>
        <Input id="hasta" name="hasta" type="date" defaultValue={hasta} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ubicacionId">Ubicación</Label>
        <select
          id="ubicacionId"
          name="ubicacionId"
          defaultValue={ubicacionId ?? ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
        >
          <option value="">Todas</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Aplicar</Button>
    </form>
  );
}
