"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Trash2, X, Banknote, CreditCard, Printer, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buscarProductosPOSAction, crearVentaAction } from "./actions";
import type {
  CrearVentaInput,
  ProductoVendible,
  TipoPrecio,
} from "@/lib/modules/ventas";

type ClienteOpcion = {
  id: string;
  codigo: string;
  nombre: string;
  tipoCliente: "PUBLICO" | "MAYOREO" | "DISTRIBUIDOR";
  tipoPrecioEfectivo: TipoPrecio;
  rfc: string | null;
  lineaCredito: number;
  saldoActual: number;
};

type CajaActiva = {
  id: string;
  folio: string;
  ubicacionId: string;
  ubicacionNombre: string;
};

type LineaCarrito = {
  uid: string;
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number; // con IVA
  descuento: number;
  ivaTasa: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

function precioDeProducto(p: ProductoVendible, tipo: TipoPrecio): number {
  return p.precios[tipo] ?? p.precios.PUBLICO ?? 0;
}

export function POSScreen({
  caja,
  clientes,
  productosIniciales,
}: {
  caja: CajaActiva;
  clientes: ClienteOpcion[];
  productosIniciales: ProductoVendible[];
}) {
  const router = useRouter();
  const [pendingSave, startSave] = useTransition();

  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const cliente = useMemo(
    () => (clienteId ? clientes.find((c) => c.id === clienteId) ?? null : null),
    [clienteId, clientes],
  );
  const tipoPrecio: TipoPrecio = cliente?.tipoPrecioEfectivo ?? "PUBLICO";

  const [productosQuery, setProductosQuery] = useState("");
  const [productos, setProductos] = useState<ProductoVendible[]>(productosIniciales);
  const [buscandoProductos, setBuscandoProductos] = useState(false);

  const [lineas, setLineas] = useState<LineaCarrito[]>([]);
  const [lineaActivaUid, setLineaActivaUid] = useState<string | null>(null);

  const [descuentoGlobal, setDescuentoGlobal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [pagoEfectivo, setPagoEfectivo] = useState<string>("0");
  const [pagoTarjeta, setPagoTarjeta] = useState<string>("0");
  const [refTarjeta, setRefTarjeta] = useState("");
  const [pagoCredito, setPagoCredito] = useState<string>("0");

  const refBusquedaProducto = useRef<HTMLInputElement | null>(null);
  const refBusquedaCliente = useRef<HTMLInputElement | null>(null);
  const refDescuentoGlobal = useRef<HTMLInputElement | null>(null);
  const refPagoEfectivo = useRef<HTMLInputElement | null>(null);

  // ----- Cálculos del carrito -----
  const calculos = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    let descuentoLineas = 0;
    for (const l of lineas) {
      const bruto = r2(l.precioUnitario * l.cantidad);
      const desc = r2(Math.min(l.descuento, bruto));
      const totalLinea = r2(bruto - desc);
      const sub = r2(totalLinea / (1 + l.ivaTasa));
      const ivaImp = r2(totalLinea - sub);
      subtotal += sub;
      iva += ivaImp;
      descuentoLineas += desc;
    }
    subtotal = r2(subtotal);
    iva = r2(iva);
    descuentoLineas = r2(descuentoLineas);
    const totalAntesDesc = r2(subtotal + iva);
    const descAplicado = r2(Math.min(descuentoGlobal, totalAntesDesc));
    const total = r2(totalAntesDesc - descAplicado);
    return { subtotal, iva, descuentoLineas, descuentoAplicado: descAplicado, total };
  }, [lineas, descuentoGlobal]);

  const pagado = r2(
    (Number(pagoEfectivo) || 0) + (Number(pagoTarjeta) || 0) + (Number(pagoCredito) || 0),
  );
  const creditoDisponible = useMemo(
    () => (cliente ? Math.max(0, cliente.lineaCredito - cliente.saldoActual) : 0),
    [cliente],
  );

  // Al cambiar tarjeta o crédito, reducimos el efectivo en proporción para que
  // el "pagado" siga cuadrando con el total (el efectivo absorbe el cambio).
  // Si el usuario edita efectivo a mano, no auto-ajustamos nada.
  function actualizarPagoTarjeta(nuevoStr: string) {
    const nuevo = Number(nuevoStr) || 0;
    const previo = Number(pagoTarjeta) || 0;
    const delta = nuevo - previo;
    if (delta !== 0) {
      const efectivoActual = Number(pagoEfectivo) || 0;
      setPagoEfectivo(String(r2(Math.max(0, efectivoActual - delta))));
    }
    setPagoTarjeta(nuevoStr);
  }
  function actualizarPagoCredito(nuevoStr: string) {
    const nuevo = Number(nuevoStr) || 0;
    const previo = Number(pagoCredito) || 0;
    const delta = nuevo - previo;
    if (delta !== 0) {
      const efectivoActual = Number(pagoEfectivo) || 0;
      setPagoEfectivo(String(r2(Math.max(0, efectivoActual - delta))));
    }
    setPagoCredito(nuevoStr);
  }
  const cambio = r2(Math.max(0, pagado - calculos.total));

  // ----- Búsqueda de productos -----
  const buscarProductos = useCallback(
    (q: string) => {
      setBuscandoProductos(true);
      buscarProductosPOSAction({ ubicacionId: caja.ubicacionId, q })
        .then((res) => setProductos(res))
        .finally(() => setBuscandoProductos(false));
    },
    [caja.ubicacionId],
  );

  useEffect(() => {
    const id = setTimeout(() => buscarProductos(productosQuery), 200);
    return () => clearTimeout(id);
  }, [productosQuery, buscarProductos]);

  // Atajo: si la query coincide exactamente con un código de barras, añadirlo al carrito.
  useEffect(() => {
    const q = productosQuery.trim();
    if (!q || productos.length === 0) return;
    const exacto = productos.find((p) => p.codigoBarras === q || p.sku === q);
    if (exacto) {
      agregarProducto(exacto);
      setProductosQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos]);

  // ----- Carrito -----
  function agregarProducto(p: ProductoVendible) {
    const precio = precioDeProducto(p, tipoPrecio);
    if (precio <= 0) {
      setError(`${p.sku}: sin precio configurado`);
      return;
    }
    setError(null);
    setLineas((prev) => {
      const existente = prev.find((l) => l.productoId === p.productoId);
      if (existente) {
        return prev.map((l) =>
          l.uid === existente.uid ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      const uid = `${p.productoId}-${Date.now()}`;
      setLineaActivaUid(uid);
      return [
        ...prev,
        {
          uid,
          productoId: p.productoId,
          sku: p.sku,
          nombre: p.nombre,
          unidadMedida: p.unidadMedida,
          cantidad: 1,
          precioUnitario: precio,
          descuento: 0,
          ivaTasa: p.ivaTasa,
        },
      ];
    });
  }

  function actualizarLinea(uid: string, patch: Partial<LineaCarrito>) {
    setLineas((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function eliminarLinea(uid: string) {
    setLineas((prev) => prev.filter((l) => l.uid !== uid));
    setLineaActivaUid((curr) => (curr === uid ? null : curr));
  }

  function limpiarCarrito() {
    setLineas([]);
    setLineaActivaUid(null);
    setDescuentoGlobal(0);
    setObservaciones("");
    setClienteId(null);
    setClienteQuery("");
    setError(null);
  }

  // ----- Cambio de tipo de precio al cambiar cliente: recalcular precios unitarios -----
  useEffect(() => {
    setLineas((prev) =>
      prev.map((l) => {
        const p = productos.find((x) => x.productoId === l.productoId);
        if (!p) return l;
        return { ...l, precioUnitario: precioDeProducto(p, tipoPrecio) };
      }),
    );
    // Reposicionamos descuento global a 0 al cambiar de cliente
    setDescuentoGlobal(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPrecio]);

  // ----- Cobro -----
  function abrirCobro() {
    if (lineas.length === 0) {
      setError("El carrito está vacío");
      return;
    }
    setError(null);
    setPagoEfectivo(String(calculos.total));
    setPagoTarjeta("0");
    setRefTarjeta("");
    setPagoCredito("0");
    setMostrarCobro(true);
    setTimeout(() => refPagoEfectivo.current?.select(), 0);
  }

  function cobrar() {
    const pagos: CrearVentaInput["pagos"] = [];
    const efectivo = Number(pagoEfectivo) || 0;
    const tarjeta = Number(pagoTarjeta) || 0;
    const credito = Number(pagoCredito) || 0;
    if (efectivo > 0) pagos.push({ forma: "EFECTIVO", monto: r2(efectivo) });
    if (tarjeta > 0)
      pagos.push({ forma: "TARJETA", monto: r2(tarjeta), referencia: refTarjeta || undefined });
    if (credito > 0) {
      if (!clienteId) {
        setError("Crédito requiere cliente seleccionado");
        return;
      }
      if (credito > creditoDisponible + 0.005) {
        setError(`Crédito excede el disponible del cliente (${fmt(creditoDisponible)})`);
        return;
      }
      pagos.push({ forma: "CREDITO", monto: r2(credito) });
    }
    if (pagos.length === 0) {
      setError("Captura al menos un pago");
      return;
    }

    const payload: CrearVentaInput = {
      cajaId: caja.id,
      clienteId: clienteId ?? undefined,
      descuentoGlobal: r2(descuentoGlobal),
      observaciones: observaciones || undefined,
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        descuento: r2(l.descuento),
      })),
      pagos,
    };

    startSave(async () => {
      setError(null);
      const res = await crearVentaAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMostrarCobro(false);
      // Descarga el recibo en PDF SIN cambiar de pestaña y avisa con un toast.
      const a = document.createElement("a");
      a.href = `/ventas/historial/${res.ventaId}/ticket/pdf`;
      a.download = `Recibo_${res.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Venta ${res.folio} cobrada`, {
        description: "El recibo se generó y se descargó en PDF.",
      });
      limpiarCarrito();
      router.refresh();
    });
  }

  // ----- Atajos de teclado -----
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const enInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "F2") {
        e.preventDefault();
        refBusquedaProducto.current?.focus();
        refBusquedaProducto.current?.select();
      } else if (e.key === "F3") {
        e.preventDefault();
        refBusquedaCliente.current?.focus();
        refBusquedaCliente.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        refDescuentoGlobal.current?.focus();
        refDescuentoGlobal.current?.select();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (mostrarCobro) cobrar();
        else abrirCobro();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lineaActivaUid) eliminarLinea(lineaActivaUid);
      } else if (e.key === "Escape" && !enInput) {
        e.preventDefault();
        if (mostrarCobro) setMostrarCobro(false);
        else if (lineas.length > 0 && confirm("¿Limpiar carrito?")) limpiarCarrito();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineaActivaUid, lineas.length, mostrarCobro, calculos.total, pagoEfectivo, pagoTarjeta, pagoCredito]);

  // ----- Filtrado de clientes en client (lista pequeña) -----
  const clientesFiltrados = useMemo(() => {
    const q = clienteQuery.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter(
        (c) =>
          c.codigo.toLowerCase().includes(q) ||
          c.nombre.toLowerCase().includes(q) ||
          (c.rfc?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 8);
  }, [clienteQuery, clientes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
      {/* ----------- Panel izquierdo: catálogo ----------- */}
      <section className="space-y-3">
        <div className="bg-card rounded-lg border p-3 space-y-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={refBusquedaProducto}
              autoFocus
              placeholder="Buscar producto (F2) — SKU, nombre, código de barras"
              value={productosQuery}
              onChange={(e) => setProductosQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Lista de precios aplicada:</span>
            <Badge variant="secondary">{tipoPrecio}</Badge>
            {buscandoProductos && <span className="ml-2">buscando…</span>}
          </div>
        </div>

        <div className="bg-card rounded-lg border max-h-[600px] overflow-y-auto divide-y">
          {productos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</div>
          ) : (
            productos.map((p) => {
              const precio = precioDeProducto(p, tipoPrecio);
              const sinStock = p.stockUbicacion <= 0;
              return (
                <button
                  key={p.productoId}
                  type="button"
                  onClick={() => agregarProducto(p)}
                  disabled={sinStock || precio <= 0}
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums">{fmt(precio)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      Stock: {p.stockUbicacion} {p.unidadMedida}
                    </div>
                  </div>
                  <Plus className="size-4 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ----------- Panel derecho: carrito + cliente + totales ----------- */}
      <section className="space-y-3">
        {/* Cliente */}
        <div className="bg-card rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cliente (F3)</span>
            {cliente && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => setClienteId(null)}
              >
                Quitar
              </button>
            )}
          </div>
          {cliente ? (
            <div className="text-sm">
              <span className="font-medium">{cliente.nombre}</span>{" "}
              <span className="text-muted-foreground font-mono text-xs">({cliente.codigo})</span>
              <div className="text-xs text-muted-foreground">
                {cliente.tipoCliente} · {cliente.rfc ?? "Sin RFC"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                ref={refBusquedaCliente}
                placeholder="Buscar cliente por código, nombre o RFC…"
                value={clienteQuery}
                onChange={(e) => setClienteQuery(e.target.value)}
              />
              {clienteQuery.trim() && clientesFiltrados.length > 0 && (
                <ul className="max-h-40 overflow-y-auto border rounded-md divide-y bg-background">
                  {clientesFiltrados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => {
                          setClienteId(c.id);
                          setClienteQuery("");
                        }}
                      >
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.codigo} · {c.tipoCliente}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Vacío = venta a público general (precios PUBLICO).
              </p>
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/30">
            <span className="text-sm font-medium">Carrito ({lineas.length})</span>
            {lineas.length > 0 && (
              <button
                type="button"
                onClick={limpiarCarrito}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <X className="size-3" /> Limpiar (ESC)
              </button>
            )}
          </div>

          {lineas.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Agrega productos desde la lista de la izquierda.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto divide-y">
              {lineas.map((l) => {
                const bruto = r2(l.precioUnitario * l.cantidad);
                const totalLinea = r2(bruto - Math.min(l.descuento, bruto));
                const activa = l.uid === lineaActivaUid;
                return (
                  <div
                    key={l.uid}
                    onClick={() => setLineaActivaUid(l.uid)}
                    className={`p-3 cursor-pointer ${activa ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{l.nombre}</div>
                        <div className="text-xs text-muted-foreground font-mono">{l.sku}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarLinea(l.uid);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        title="Eliminar (F9)"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-[80px_1fr_100px_110px] gap-2 items-center">
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={l.cantidad}
                        onChange={(e) =>
                          actualizarLinea(l.uid, { cantidad: Math.max(0.001, Number(e.target.value) || 0) })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        × {fmt(l.precioUnitario)} {l.unidadMedida}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Desc."
                        value={l.descuento || ""}
                        onChange={(e) =>
                          actualizarLinea(l.uid, { descuento: Math.max(0, Number(e.target.value) || 0) })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-sm"
                        title="Descuento de la línea en moneda"
                      />
                      <div className="text-right font-semibold tabular-nums">{fmt(totalLinea)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totales */}
          <div className="border-t bg-muted/20 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{fmt(calculos.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span className="tabular-nums">{fmt(calculos.iva)}</span>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-muted-foreground flex items-center gap-1">
                Descuento global (F4)
              </label>
              <Input
                ref={refDescuentoGlobal}
                type="number"
                step="0.01"
                min="0"
                value={descuentoGlobal || ""}
                onChange={(e) => setDescuentoGlobal(Math.max(0, Number(e.target.value) || 0))}
                className="h-7 w-24 text-right tabular-nums"
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t mt-1">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums">{fmt(calculos.total)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
            {error}
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={lineas.length === 0 || pendingSave}
          onClick={abrirCobro}
        >
          Cobrar (F8) · {fmt(calculos.total)}
        </Button>
      </section>

      {/* ----------- Modal de cobro ----------- */}
      {mostrarCobro && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Cobrar</h3>
              <button
                type="button"
                onClick={() => setMostrarCobro(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-muted/30 rounded-md p-3 text-center">
              <div className="text-xs text-muted-foreground">Total a cobrar</div>
              <div className="text-3xl font-bold tabular-nums">{fmt(calculos.total)}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Banknote className="size-4" /> Efectivo
                </label>
                <Input
                  ref={refPagoEfectivo}
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagoEfectivo}
                  onChange={(e) => setPagoEfectivo(e.target.value)}
                  className="text-lg tabular-nums"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="size-4" /> Tarjeta
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagoTarjeta}
                  onChange={(e) => actualizarPagoTarjeta(e.target.value)}
                  className="text-lg tabular-nums"
                />
                {(Number(pagoTarjeta) || 0) > 0 && (
                  <Input
                    placeholder="Referencia / últimos 4 (opcional)"
                    value={refTarjeta}
                    onChange={(e) => setRefTarjeta(e.target.value)}
                    className="mt-2 text-sm"
                  />
                )}
              </div>
              {cliente && cliente.lineaCredito > 0 && (
                <div>
                  <label className="text-sm font-medium flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Wallet className="size-4" /> Crédito
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Disponible: <span className="tabular-nums font-medium text-foreground">{fmt(creditoDisponible)}</span>
                    </span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={creditoDisponible}
                    value={pagoCredito}
                    onChange={(e) => actualizarPagoCredito(e.target.value)}
                    className="text-lg tabular-nums"
                    disabled={creditoDisponible <= 0}
                  />
                  {creditoDisponible <= 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      El cliente alcanzó su límite de crédito.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recibido</span>
                <span className="tabular-nums">{fmt(pagado)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Cambio</span>
                <span className="tabular-nums">{fmt(cambio)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setMostrarCobro(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={cobrar}
                disabled={pendingSave || pagado + 0.001 < calculos.total}
              >
                <Printer className="size-4" />
                {pendingSave ? "Guardando…" : "Cobrar (F8)"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
