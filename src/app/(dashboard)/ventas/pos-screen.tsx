"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Trash2, X, Banknote, CreditCard, Printer, Wallet, Pause, Tag } from "lucide-react";
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
  descuento: number; // monto en $ o % según descModo
  descModo: "monto" | "pct";
  ivaTasa: number;
};

// Una venta suspendida (carrito completo guardado para retomar luego).
type VentaEnEspera = {
  id: string;
  etiqueta: string;
  creadoEn: number;
  clienteId: string | null;
  lineas: LineaCarrito[];
  descuentoGlobal: number;
  descGlobalModo?: "monto" | "pct";
  observaciones: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

// Billetes mexicanos para los botones de cobro rápido en efectivo.
const DENOMINACIONES = [50, 100, 200, 500, 1000];

function precioDeProducto(p: ProductoVendible, tipo: TipoPrecio): number {
  return p.precios[tipo] ?? p.precios.PUBLICO ?? 0;
}

// Descuento efectivo de una línea en pesos (interpreta monto $ o %, limitado al bruto).
function descEfectivoLinea(l: LineaCarrito): number {
  const bruto = r2(l.precioUnitario * l.cantidad);
  const raw = l.descModo === "pct" ? r2(bruto * (l.descuento / 100)) : l.descuento;
  return r2(Math.min(Math.max(0, raw), bruto));
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
  const [descGlobalModo, setDescGlobalModo] = useState<"monto" | "pct">("monto");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [pagoEfectivo, setPagoEfectivo] = useState<string>("0");
  const [pagoTarjeta, setPagoTarjeta] = useState<string>("0");
  const [refTarjeta, setRefTarjeta] = useState("");
  const [pagoCredito, setPagoCredito] = useState<string>("0");
  // false = el efectivo trae el "exacto" precargado; el 1er toque de denominación lo reemplaza.
  const [efectivoEditado, setEfectivoEditado] = useState(false);

  // Ventas en espera (suspender/recuperar), persistidas por caja en el navegador.
  const [enEspera, setEnEspera] = useState<VentaEnEspera[]>([]);
  const [mostrarEnEspera, setMostrarEnEspera] = useState(false);
  const claveEspera = `pos-espera-${caja.id}`;

  // Consulta de precio (F6): al elegir un producto muestra sus precios sin agregarlo.
  const [modoConsulta, setModoConsulta] = useState(false);
  // Última venta cobrada, para reimprimir su recibo sin buscarla en el historial.
  const [ultimaVenta, setUltimaVenta] = useState<{ ventaId: string; folio: string } | null>(null);

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
      const desc = descEfectivoLinea(l);
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
    const descGlobalBruto =
      descGlobalModo === "pct" ? r2(totalAntesDesc * (descuentoGlobal / 100)) : descuentoGlobal;
    const descAplicado = r2(Math.min(Math.max(0, descGlobalBruto), totalAntesDesc));
    const total = r2(totalAntesDesc - descAplicado);
    return { subtotal, iva, descuentoLineas, descuentoAplicado: descAplicado, total };
  }, [lineas, descuentoGlobal, descGlobalModo]);

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
      seleccionarProducto(exacto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos]);

  // Cargar/guardar las ventas en espera en localStorage (sobreviven recargas).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(claveEspera);
      if (raw) setEnEspera(JSON.parse(raw) as VentaEnEspera[]);
    } catch {
      /* storage no disponible o corrupto: se ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(claveEspera, JSON.stringify(enEspera));
    } catch {
      /* sin storage: no pasa nada */
    }
  }, [enEspera, claveEspera]);

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
          descModo: "monto",
          ivaTasa: p.ivaTasa,
        },
      ];
    });
  }

  // Selección desde el dropdown de autocompletar: agrega y deja listo el
  // buscador para el siguiente producto (cierra la lista al limpiar la query).
  function seleccionarProducto(p: ProductoVendible) {
    if (modoConsulta) {
      toast(p.nombre, {
        description: `Público ${fmt(p.precios.PUBLICO ?? 0)} · Mayoreo ${fmt(p.precios.MAYOREO ?? 0)} · Distribuidor ${fmt(p.precios.DISTRIBUIDOR ?? 0)} · Stock ${p.stockUbicacion} ${p.unidadMedida}`,
      });
    } else {
      agregarProducto(p);
    }
    setProductosQuery("");
    setTimeout(() => refBusquedaProducto.current?.focus(), 0);
  }

  function actualizarLinea(uid: string, patch: Partial<LineaCarrito>) {
    setLineas((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function eliminarLinea(uid: string) {
    setLineas((prev) => prev.filter((l) => l.uid !== uid));
    setLineaActivaUid((curr) => (curr === uid ? null : curr));
  }

  // Navegación del carrito por teclado (flechas mueven la línea activa, +/− la cantidad).
  function moverLineaActiva(dir: 1 | -1) {
    if (lineas.length === 0) return;
    const idx = lineas.findIndex((l) => l.uid === lineaActivaUid);
    const next = idx < 0 ? (dir === 1 ? 0 : lineas.length - 1) : Math.min(lineas.length - 1, Math.max(0, idx + dir));
    setLineaActivaUid(lineas[next].uid);
  }
  function nudgeCantidad(delta: number) {
    if (!lineaActivaUid) return;
    setLineas((prev) =>
      prev.map((l) => (l.uid === lineaActivaUid ? { ...l, cantidad: Math.max(1, r2(l.cantidad + delta)) } : l)),
    );
  }

  function limpiarCarrito() {
    setLineas([]);
    setLineaActivaUid(null);
    setDescuentoGlobal(0);
    setDescGlobalModo("monto");
    setObservaciones("");
    setClienteId(null);
    setClienteQuery("");
    setError(null);
  }

  // ----- Ventas en espera (suspender / recuperar) -----
  function suspenderVenta() {
    if (lineas.length === 0) return;
    const etiqueta = cliente
      ? cliente.nombre
      : `Ticket ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
    setEnEspera((prev) => [
      { id: `esp-${Date.now()}`, etiqueta, creadoEn: Date.now(), clienteId, lineas, descuentoGlobal, descGlobalModo, observaciones },
      ...prev,
    ]);
    limpiarCarrito();
    toast.success("Venta puesta en espera");
  }
  function recuperarVenta(v: VentaEnEspera) {
    if (lineas.length > 0 && !confirm("El carrito actual se reemplazará. ¿Continuar?")) return;
    setLineas(v.lineas);
    setClienteId(v.clienteId);
    setDescuentoGlobal(v.descuentoGlobal);
    setDescGlobalModo(v.descGlobalModo ?? "monto");
    setObservaciones(v.observaciones);
    setLineaActivaUid(v.lineas[0]?.uid ?? null);
    setEnEspera((prev) => prev.filter((x) => x.id !== v.id));
    setMostrarEnEspera(false);
    setError(null);
  }
  function eliminarEnEspera(id: string) {
    setEnEspera((prev) => prev.filter((x) => x.id !== id));
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
    setEfectivoEditado(false);
    setPagoTarjeta("0");
    setRefTarjeta("");
    setPagoCredito("0");
    setMostrarCobro(true);
    setTimeout(() => refPagoEfectivo.current?.select(), 0);
  }

  // Denominaciones rápidas de efectivo. El primer toque (cuando el efectivo aún
  // trae el "exacto" precargado) reemplaza ese monto; los siguientes suman, así
  // el cajero teclea "lo que me dio el cliente" (un 200 + un 100, etc.).
  function tapDenominacion(monto: number) {
    setPagoEfectivo((prev) => String(r2((efectivoEditado ? Number(prev) || 0 : 0) + monto)));
    setEfectivoEditado(true);
    refPagoEfectivo.current?.focus();
  }
  function efectivoExacto() {
    setPagoEfectivo(String(calculos.total));
    setEfectivoEditado(false);
  }
  function limpiarEfectivo() {
    setPagoEfectivo("0");
    setEfectivoEditado(true);
    refPagoEfectivo.current?.focus();
  }
  // Pago dividido: pone en tarjeta lo que falte para cubrir el total.
  function completarConTarjeta() {
    const falta = r2(Math.max(0, calculos.total - (Number(pagoEfectivo) || 0) - (Number(pagoCredito) || 0)));
    setPagoTarjeta(String(falta));
  }

  // Descarga el recibo en PDF sin cambiar de pestaña (reusado por cobrar y reimprimir).
  function descargarRecibo(ventaId: string, folio: string) {
    const a = document.createElement("a");
    a.href = `/ventas/historial/${ventaId}/ticket/pdf`;
    a.download = `Recibo_${folio}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function reimprimirUltima() {
    if (ultimaVenta) descargarRecibo(ultimaVenta.ventaId, ultimaVenta.folio);
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
      descuentoGlobal: calculos.descuentoAplicado,
      observaciones: observaciones || undefined,
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        descuento: descEfectivoLinea(l),
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
      setUltimaVenta({ ventaId: res.ventaId, folio: res.folio });
      // Descarga el recibo en PDF SIN cambiar de pestaña y avisa con un toast.
      descargarRecibo(res.ventaId, res.folio);
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
      } else if (e.key === "F6") {
        e.preventDefault();
        setModoConsulta((v) => !v);
        refBusquedaProducto.current?.focus();
        refBusquedaProducto.current?.select();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (mostrarCobro) cobrar();
        else abrirCobro();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lineaActivaUid) eliminarLinea(lineaActivaUid);
      } else if (e.key === "F7") {
        e.preventDefault();
        if (!mostrarCobro) suspenderVenta();
      } else if (!enInput && !mostrarCobro && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        moverLineaActiva(e.key === "ArrowDown" ? 1 : -1);
      } else if (!enInput && !mostrarCobro && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        nudgeCantidad(1);
      } else if (!enInput && !mostrarCobro && e.key === "-") {
        e.preventDefault();
        nudgeCantidad(-1);
      } else if (!enInput && !mostrarCobro && e.key === "Delete") {
        e.preventDefault();
        if (lineaActivaUid) eliminarLinea(lineaActivaUid);
      } else if (e.key === "Escape" && modoConsulta) {
        e.preventDefault();
        setModoConsulta(false);
      } else if (e.key === "Escape" && !enInput) {
        e.preventDefault();
        if (mostrarCobro) setMostrarCobro(false);
        else if (lineas.length > 0 && confirm("¿Limpiar carrito?")) limpiarCarrito();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, lineaActivaUid, mostrarCobro, modoConsulta, clienteId, descuentoGlobal, observaciones, calculos.total, pagoEfectivo, pagoTarjeta, pagoCredito]);

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
          {modoConsulta && (
            <div className="flex items-center justify-between rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Tag className="size-3.5" /> Consulta de precio — no se agrega al carrito
              </span>
              <button type="button" onClick={() => setModoConsulta(false)} className="hover:underline">
                Salir (Esc)
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={refBusquedaProducto}
              autoFocus
              placeholder="Buscar producto (F2) — nombre, código de barras o SKU"
              value={productosQuery}
              onChange={(e) => setProductosQuery(e.target.value)}
              className="pl-9"
            />

            {/* Resultados en vivo (autocompletar) bajo el buscador */}
            {productosQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border rounded-md shadow-lg max-h-[360px] overflow-y-auto divide-y">
                {productos.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {buscandoProductos ? "buscando…" : "Sin resultados."}
                  </div>
                ) : (
                  productos.map((p) => {
                    const precio = precioDeProducto(p, tipoPrecio);
                    const sinStock = p.stockUbicacion <= 0;
                    return (
                      <button
                        key={p.productoId}
                        type="button"
                        onClick={() => seleccionarProducto(p)}
                        disabled={sinStock || precio <= 0}
                        className="w-full text-left p-3 flex items-center gap-3 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.nombre}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {p.sku}
                            {p.codigoBarras ? ` · ${p.codigoBarras}` : ""}
                          </div>
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
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Lista de precios aplicada:</span>
            <Badge variant="secondary">{tipoPrecio}</Badge>
            {buscandoProductos && <span className="ml-2">buscando…</span>}
          </div>
        </div>

        {/* Ayuda (el panel grande de productos se reemplazó por el autocompletar de arriba) */}
        <div className="bg-card rounded-lg border p-4 text-sm text-muted-foreground space-y-2">
          {ultimaVenta && (
            <button
              type="button"
              onClick={reimprimirUltima}
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Printer className="size-3.5" /> Reimprimir último ticket ({ultimaVenta.folio})
            </button>
          )}
          <p>
            Escribe en el buscador para ver productos que coincidan en{" "}
            <span className="font-medium text-foreground">nombre</span>,{" "}
            <span className="font-medium text-foreground">código de barras</span> o{" "}
            <span className="font-medium text-foreground">SKU</span>. Da clic en un
            resultado para agregarlo al carrito.
          </p>
          <p>Si escaneas o tecleas un código de barras exacto, se agrega solo.</p>
          <p className="text-xs">
            Atajos: <span className="font-mono">F2</span> buscar ·{" "}
            <span className="font-mono">F3</span> cliente ·{" "}
            <span className="font-mono">F4</span> descuento ·{" "}
            <span className="font-mono">F6</span> consulta precio ·{" "}
            <span className="font-mono">F7</span> suspender ·{" "}
            <span className="font-mono">F8</span> cobrar ·{" "}
            <span className="font-mono">F9</span> quitar línea ·{" "}
            <span className="font-mono">↑↓</span> línea ·{" "}
            <span className="font-mono">+/−</span> cantidad.
          </p>
        </div>
      </section>

      {/* ----------- Panel derecho: carrito + cliente + totales ----------- */}
      <section className="space-y-3">
        {/* Ventas en espera */}
        {enEspera.length > 0 && (
          <div className="bg-card rounded-lg border">
            <button
              type="button"
              onClick={() => setMostrarEnEspera((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent/50"
            >
              <span className="flex items-center gap-2">
                <Pause className="size-4" /> En espera ({enEspera.length})
              </span>
              <span className="text-xs text-muted-foreground">{mostrarEnEspera ? "Ocultar" : "Ver"}</span>
            </button>
            {mostrarEnEspera && (
              <ul className="border-t divide-y max-h-48 overflow-y-auto">
                {enEspera.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{v.etiqueta}</div>
                      <div className="text-xs text-muted-foreground">
                        {v.lineas.length} art. ·{" "}
                        {new Date(v.creadoEn).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => recuperarVenta(v)}>
                      Recuperar
                    </Button>
                    <button
                      type="button"
                      onClick={() => eliminarEnEspera(v.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Descartar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={suspenderVenta}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Pause className="size-3" /> Suspender (F7)
                </button>
                <button
                  type="button"
                  onClick={limpiarCarrito}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <X className="size-3" /> Limpiar (ESC)
                </button>
              </div>
            )}
          </div>

          {lineas.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Agrega productos desde la lista de la izquierda.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto divide-y">
              {lineas.map((l) => {
                const totalLinea = r2(r2(l.precioUnitario * l.cantidad) - descEfectivoLinea(l));
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
                    <div className="mt-2 grid grid-cols-[64px_1fr_116px_84px] gap-2 items-center">
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
                      <span className="text-xs text-muted-foreground truncate">
                        × {fmt(l.precioUnitario)} {l.unidadMedida}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            actualizarLinea(l.uid, { descModo: l.descModo === "pct" ? "monto" : "pct" });
                          }}
                          className="h-8 w-6 shrink-0 rounded border text-xs font-medium text-muted-foreground hover:bg-accent"
                          title="Cambiar descuento $ / %"
                        >
                          {l.descModo === "pct" ? "%" : "$"}
                        </button>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Desc."
                          value={l.descuento || ""}
                          onChange={(e) => {
                            const v = Math.max(0, Number(e.target.value) || 0);
                            actualizarLinea(l.uid, { descuento: l.descModo === "pct" ? Math.min(100, v) : v });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 text-sm"
                          title="Descuento de la línea"
                        />
                      </div>
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
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Descuento global (F4)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDescGlobalModo((m) => (m === "pct" ? "monto" : "pct"))}
                  className="h-7 w-7 shrink-0 rounded border text-xs font-medium text-muted-foreground hover:bg-accent"
                  title="Cambiar descuento $ / %"
                >
                  {descGlobalModo === "pct" ? "%" : "$"}
                </button>
                <Input
                  ref={refDescuentoGlobal}
                  type="number"
                  step="0.01"
                  min="0"
                  value={descuentoGlobal || ""}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value) || 0);
                    setDescuentoGlobal(descGlobalModo === "pct" ? Math.min(100, v) : v);
                  }}
                  className="h-7 w-20 text-right tabular-nums"
                />
              </div>
            </div>
            {descGlobalModo === "pct" && calculos.descuentoAplicado > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{descuentoGlobal}% de descuento</span>
                <span className="tabular-nums">− {fmt(calculos.descuentoAplicado)}</span>
              </div>
            )}
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
          <div
            className="bg-card border rounded-lg shadow-lg w-full max-w-md p-5 space-y-4"
            onKeyDown={(e) => {
              // Enter cobra (salvo que el foco esté en un botón, para no anular su clic).
              if (e.key !== "Enter") return;
              if ((e.target as HTMLElement).tagName.toLowerCase() === "button") return;
              e.preventDefault();
              if (!pendingSave && pagado + 0.001 >= calculos.total) cobrar();
            }}
          >
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
                  onChange={(e) => {
                    setPagoEfectivo(e.target.value);
                    setEfectivoEditado(true);
                  }}
                  className="text-lg tabular-nums"
                />
                {/* Cobro rápido: billetes + exacto + limpiar */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={efectivoExacto}
                  >
                    Exacto
                  </Button>
                  {DENOMINACIONES.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 tabular-nums"
                      onClick={() => tapDenominacion(d)}
                    >
                      ${d}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-muted-foreground"
                    onClick={limpiarEfectivo}
                    title="Poner el efectivo en 0"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="size-4" /> Tarjeta
                  </label>
                  {r2((Number(pagoEfectivo) || 0) + (Number(pagoCredito) || 0)) < calculos.total - 0.005 && (
                    <button
                      type="button"
                      onClick={completarConTarjeta}
                      className="text-xs text-primary hover:underline"
                    >
                      Completar con tarjeta
                    </button>
                  )}
                </div>
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
              {pagado + 0.005 < calculos.total ? (
                <div className="flex justify-between items-baseline font-semibold text-destructive">
                  <span>Falta</span>
                  <span className="text-xl tabular-nums">{fmt(r2(calculos.total - pagado))}</span>
                </div>
              ) : (
                <div className="flex justify-between items-baseline font-semibold">
                  <span>Cambio</span>
                  <span
                    className={`text-2xl tabular-nums ${cambio > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                  >
                    {fmt(cambio)}
                  </span>
                </div>
              )}
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
                {pendingSave ? "Guardando…" : "Cobrar (Enter)"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
