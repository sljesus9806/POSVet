"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actualizarProductoAction, crearProductoAction, type FormState } from "./actions";
import type { ProductoDetalle, CategoriaListado } from "@/lib/modules/productos";

const initial: FormState = { ok: false };

// Unidades comunes. Valor = lo que se guarda (corto, máx 10 chars); label = lo que se ve.
const UNIDADES = [
  { value: "PZA", label: "Pieza (PZA)" },
  { value: "ML", label: "Mililitro (ml)" },
  { value: "L", label: "Litro (L)" },
  { value: "KG", label: "Kilogramo (kg)" },
  { value: "G", label: "Gramo (g)" },
  { value: "CAJA", label: "Caja" },
  { value: "PAQUETE", label: "Paquete" },
  { value: "DOSIS", label: "Dosis" },
  { value: "SERVICIO", label: "Servicio" },
] as const;

// Para mostrar/parsear números de dinero sin acarrear errores de coma flotante.
const num = (s: string) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};
const r2 = (x: number) => String(Math.round(x * 100) / 100);

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

type CostalOrigen = {
  id: string;
  nombre: string;
  contenido: number | null;
  unidadMedida: string;
  stockCerrado: number;
};

type Props = {
  categorias: CategoriaListado[];
  producto?: ProductoDetalle;
  ubicaciones?: { id: string; nombre: string }[];
  // Para ligar un granel a su costal: catálogo de productos elegibles como costal.
  productosCostal?: { id: string; nombre: string; sku: string }[];
  // En edición de un granel: su costal de origen (si ya está ligado) y cuánto
  // granel hay abierto ahora mismo.
  costalOrigen?: CostalOrigen | null;
  stockGranelAbierto?: number;
};

export function ProductoForm({
  categorias,
  producto,
  ubicaciones = [],
  productosCostal = [],
  costalOrigen = null,
  stockGranelAbierto = 0,
}: Props) {
  const isEdit = !!producto;
  const action = isEdit ? actualizarProductoAction : crearProductoAction;
  const [state, formAction] = useActionState(action, initial);

  // --- Precio: costo + ganancia (%) → precio final, enlazados entre sí ---
  const costoInicial = producto?.ultimoCosto ?? 0;
  const finalInicial = producto?.precios.find((p) => p.tipo === "PUBLICO")?.precio ?? 0;
  // % de ganancia sobre el costo: pct = (final/costo − 1) · 100
  const pctDe = (final: number, costo: number) => (costo > 0 ? (final / costo - 1) * 100 : 0);
  // precio final a partir del % de ganancia: final = costo · (1 + pct/100)
  const finalDe = (costo: number, pct: number) => costo * (1 + pct / 100);

  const [costo, setCosto] = useState(costoInicial ? r2(costoInicial) : "");
  const [precioFinal, setPrecioFinal] = useState(finalInicial ? r2(finalInicial) : "");
  const [ganancia, setGanancia] = useState(
    costoInicial > 0 && finalInicial ? r2(pctDe(finalInicial, costoInicial)) : "",
  );

  // Editar el costo: mantiene el % de ganancia y recalcula el precio final.
  const onCosto = (v: string) => {
    setCosto(v);
    setPrecioFinal(r2(finalDe(num(v), num(ganancia))));
  };
  // Editar el % de ganancia: recalcula el precio final.
  const onGanancia = (v: string) => {
    setGanancia(v);
    setPrecioFinal(r2(finalDe(num(costo), num(v))));
  };
  // Editar el precio final: recalcula el % de ganancia.
  const onPrecioFinal = (v: string) => {
    setPrecioFinal(v);
    setGanancia(num(costo) > 0 ? r2(pctDe(num(v), num(costo))) : "");
  };

  // Venta a granel: este producto puede SER un costal que se abre, o VENDERSE a
  // granel saliendo de un costal (camino inverso). Detectamos el modo inicial.
  const [granelModo, setGranelModo] = useState<"ninguno" | "esGranel" | "esCostal">(
    producto?.productoGranelId ? "esCostal" : costalOrigen ? "esGranel" : "ninguno",
  );
  // Costal de origen: se ESCRIBE el nombre. Si coincide con uno existente se liga;
  // si no, se crea con ese nombre. (Cuánto trae el costal se define al abrirlo.)
  const [costalNombre, setCostalNombre] = useState<string>(costalOrigen?.nombre ?? "");
  const costalExistente = productosCostal.find(
    (p) => p.nombre.trim().toLowerCase() === costalNombre.trim().toLowerCase(),
  );
  const costalEsNuevo = costalNombre.trim().length > 0 && !costalExistente;
  // Unidad de este producto, en vivo, para los textos de granel.
  const [unidadGranelActual, setUnidadGranelActual] = useState(producto?.unidadMedida ?? "PZA");

  // Si el producto traía una unidad libre que no está en la lista, la conservamos.
  const unidadActual = producto?.unidadMedida ?? "PZA";
  const unidades = UNIDADES.some((u) => u.value === unidadActual)
    ? UNIDADES
    : [{ value: unidadActual, label: unidadActual }, ...UNIDADES];

  const tieneEspecializados = !!(
    producto?.especie ||
    producto?.laboratorio ||
    producto?.viaAdministracion ||
    producto?.requiereReceta ||
    producto?.sustanciaControlada
  );

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={producto!.id} />}

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Producto guardado correctamente.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Identificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sku">Código interno (SKU)</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={producto?.sku}
              placeholder={isEdit ? "" : "Se genera solo si lo dejas vacío"}
            />
            <Err msgs={state.fieldErrors?.sku} />
          </div>
          <div>
            <Label htmlFor="codigoBarras">Código de barras</Label>
            <Input id="codigoBarras" name="codigoBarras" defaultValue={producto?.codigoBarras ?? ""} />
            <Err msgs={state.fieldErrors?.codigoBarras} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={producto?.nombre} required />
            <Err msgs={state.fieldErrors?.nombre} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion ?? ""} rows={2} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Clasificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={producto?.tipo ?? "ACCESORIO"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ACCESORIO">Artículo / Accesorio</option>
              <option value="ALIMENTO">Alimento</option>
              <option value="MEDICAMENTO">Medicamento</option>
              <option value="SERVICIO">Servicio</option>
            </select>
          </div>
          <div>
            <Label htmlFor="categoriaId">Categoría</Label>
            <select
              id="categoriaId"
              name="categoriaId"
              defaultValue={producto?.categoriaId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="unidadMedida">Unidad de medida</Label>
            <select
              id="unidadMedida"
              name="unidadMedida"
              defaultValue={unidadActual}
              onChange={(e) => setUnidadGranelActual(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {unidades.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="marca">Marca</Label>
            <Input id="marca" name="marca" defaultValue={producto?.marca ?? ""} />
          </div>
        </div>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm pt-2">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={producto?.activo ?? true}
              className="size-4"
            />
            Activo
          </label>
        )}
      </section>

      <details open={tieneEspecializados} className="rounded-lg border bg-card p-5">
        <summary className="font-semibold cursor-pointer select-none">
          Campos especializados{" "}
          <span className="text-xs font-normal text-muted-foreground">
            — farmacia / veterinaria (opcionales)
          </span>
        </summary>
        <p className="text-xs text-muted-foreground mt-3 mb-4">
          Complétalos solo si tu giro lo necesita (medicamentos, insumos
          veterinarios). Para abarrotes u otros giros, déjalos vacíos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="especie">Especie</Label>
            <Input id="especie" name="especie" defaultValue={producto?.especie ?? ""} placeholder="Canino, Felino…" />
          </div>
          <div>
            <Label htmlFor="laboratorio">Laboratorio</Label>
            <Input id="laboratorio" name="laboratorio" defaultValue={producto?.laboratorio ?? ""} />
          </div>
          <div>
            <Label htmlFor="viaAdministracion">Vía de administración</Label>
            <Input
              id="viaAdministracion"
              name="viaAdministracion"
              defaultValue={producto?.viaAdministracion ?? ""}
              placeholder="Oral, inyectable, tópica…"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiereReceta"
              defaultChecked={producto?.requiereReceta ?? false}
              className="size-4"
            />
            Requiere receta médica
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="sustanciaControlada"
              defaultChecked={producto?.sustanciaControlada ?? false}
              className="size-4"
            />
            Sustancia controlada (COFEPRIS)
          </label>
        </div>
      </details>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Precio</h3>
        <p className="text-xs text-muted-foreground">
          Captura lo que te cuesta y cuánto quieres ganar. El precio final se calcula
          solo, pero puedes ajustarlo a mano. Los descuentos se aplican al vender.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="ultimoCosto">Precio unitario (lo que te cuesta)</Label>
            <Input
              id="ultimoCosto"
              name="ultimoCosto"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={costo}
              onChange={(e) => onCosto(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="ganancia">Ganancia (%)</Label>
            <Input
              id="ganancia"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={ganancia}
              onChange={(e) => onGanancia(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="precio_PUBLICO">Precio final (venta al público)</Label>
            <Input
              id="precio_PUBLICO"
              name="precio_PUBLICO"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={precioFinal}
              onChange={(e) => onPrecioFinal(e.target.value)}
              placeholder="0.00"
              className="font-medium"
            />
          </div>
        </div>
        {state.fieldErrors?.precios && (
          <Err msgs={state.fieldErrors.precios as unknown as string[]} />
        )}
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Venta a granel</h3>
        <p className="text-xs text-muted-foreground">
          Para vender suelto lo que viene en costal o caja (croquetas, arroz, frijol…).
          El costal y el producto a granel quedan ligados: al “Abrir” un costal, su
          contenido pasa al producto a granel.
        </p>

        <input type="hidden" name="granelModo" value={granelModo} />
        <div>
          <Label htmlFor="granelModo_sel">¿Este producto participa en venta a granel?</Label>
          <select
            id="granelModo_sel"
            value={granelModo}
            onChange={(e) => setGranelModo(e.target.value as typeof granelModo)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ninguno">No</option>
            <option value="esGranel">Sí — se vende a granel (sale de un costal)</option>
            <option value="esCostal">Sí — es un costal que se abre</option>
          </select>
        </div>

        {/* Camino granel → costal: este producto (ej. "kilo croquetas") sale de un costal. */}
        {granelModo === "esGranel" && (
          <div className="space-y-4 rounded-md border bg-muted/30 p-4">
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                {stockGranelAbierto > 0
                  ? `Ahora mismo hay ${r2(stockGranelAbierto)} ${unidadGranelActual} abiertos listos para vender.`
                  : "No hay producto a granel abierto todavía; abre un costal desde la lista de productos."}
                {costalOrigen &&
                  ` Costal de origen: ${costalOrigen.nombre} (${costalOrigen.stockCerrado} cerrados).`}
              </p>
            )}
            <input
              type="hidden"
              name="costalExistenteId"
              value={costalExistente?.id ?? ""}
            />
            <div>
              <Label htmlFor="costalNombre">¿De qué costal sale?</Label>
              <Input
                id="costalNombre"
                name="costalNombre"
                list="costales-sugeridos"
                value={costalNombre}
                onChange={(e) => setCostalNombre(e.target.value)}
                placeholder="Escribe el costal (ej. Costal Croquetas Perrón 20 kg)"
                autoComplete="off"
              />
              <datalist id="costales-sugeridos">
                {productosCostal.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.sku}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                {costalExistente
                  ? `Se ligará al costal existente “${costalExistente.nombre}”.`
                  : costalEsNuevo
                    ? "No existe: se creará un costal nuevo con ese nombre."
                    : "Escribe el nombre del costal; si ya existe lo ligamos, si no lo creamos."}
              </p>
            </div>

            {costalEsNuevo && (
              <div className="sm:max-w-xs">
                <Label htmlFor="nuevoCostalCosto">¿Cuánto te cuesta el costal? (opcional)</Label>
                <Input
                  id="nuevoCostalCosto"
                  name="nuevoCostalCosto"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Cuántos {unidadGranelActual} trae el costal se define al “Abrir” un costal
              desde la lista de productos; al venderlo, el granel resta de lo abierto.
            </p>
          </div>
        )}

        {/* Camino costal → granel: este producto ES el costal y crea su granel. */}
        {granelModo === "esCostal" && (
          <div className="space-y-4 rounded-md border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Se creará un producto
              {producto?.nombre ? ` “${producto.nombre} (granel)”` : " “(granel)”"} con su
              propio precio; luego usa “Abrir” en la lista de productos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contenidoGranel">¿Cuántas unidades sueltas trae un empaque?</Label>
                <Input
                  id="contenidoGranel"
                  name="contenidoGranel"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  defaultValue={producto?.contenidoGranel ?? ""}
                  placeholder="ej. 20000"
                />
              </div>
              <div>
                <Label htmlFor="unidadGranel">Unidad del granel</Label>
                <select
                  id="unidadGranel"
                  name="unidadGranel"
                  defaultValue="G"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {UNIDADES.filter((u) => ["G", "KG", "ML", "L", "PZA"].includes(u.value)).map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {!isEdit && ubicaciones.length > 0 && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-semibold">Stock inicial</h3>
          <p className="text-xs text-muted-foreground">
            Opcional. Escribe la cantidad que tienes en cada ubicación; puedes llenar
            varias a la vez. Deja en blanco las que no apliquen. Después puedes agregar
            o ajustar desde la pantalla de productos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {ubicaciones.map((u) => (
              <div key={u.id}>
                <Label htmlFor={`stock_${u.id}`}>{u.nombre}</Label>
                <Input
                  id={`stock_${u.id}`}
                  name={`stock_${u.id}`}
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href="/productos">Cancelar</Link>
        </Button>
        <Submit label={isEdit ? "Guardar cambios" : "Crear producto"} />
      </div>
    </form>
  );
}
