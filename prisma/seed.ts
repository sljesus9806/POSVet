import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---- Catálogo de permisos por módulo ----
const MODULOS = [
  "ventas",
  "clientes",
  "productos",
  "inventario",
  "proveedores",
  "facturacion",
  "reportes",
  "usuarios",
  "configuracion",
  "cajas",
] as const;

const ACCIONES = ["leer", "crear", "editar", "eliminar", "autorizar"] as const;

type RolCodigo = "ADMIN" | "SUPERVISOR" | "CAJERO" | "ALMACENISTA" | "READONLY";

const ROLES: Array<{
  codigo: RolCodigo;
  nombre: string;
  descripcion: string;
  // patrones de permisos que tiene (formato "modulo:accion" o "modulo:*" o "*")
  permisos: string[];
}> = [
  {
    codigo: "ADMIN",
    nombre: "Administrador",
    descripcion: "Acceso total al sistema, incluyendo configuración y reportes financieros",
    permisos: ["*"],
  },
  {
    codigo: "SUPERVISOR",
    nombre: "Supervisor",
    descripcion: "Ventas, cancelaciones, autorización de descuentos, reportes operativos",
    permisos: [
      "ventas:*",
      "clientes:*",
      "productos:leer",
      "inventario:leer",
      "cajas:*",
      "reportes:leer",
      "facturacion:leer",
      "facturacion:crear",
    ],
  },
  {
    codigo: "CAJERO",
    nombre: "Cajero/Vendedor",
    descripcion: "Vender, consultar productos, consultar saldo de cliente",
    permisos: [
      "ventas:leer",
      "ventas:crear",
      "clientes:leer",
      "clientes:crear",
      "productos:leer",
      "inventario:leer",
      "cajas:leer",
      "cajas:crear",
    ],
  },
  {
    codigo: "ALMACENISTA",
    nombre: "Almacenista",
    descripcion: "Recepciones, transferencias, ajustes de inventario, conteos físicos",
    permisos: [
      "productos:leer",
      "productos:editar",
      "inventario:*",
      "proveedores:leer",
    ],
  },
  {
    codigo: "READONLY",
    nombre: "Solo lectura",
    descripcion: "Consulta de reportes sin modificar nada (útil para el contador externo)",
    permisos: [
      "ventas:leer",
      "clientes:leer",
      "productos:leer",
      "inventario:leer",
      "proveedores:leer",
      "facturacion:leer",
      "reportes:leer",
    ],
  },
];

function permisoCoincide(patron: string, codigo: string): boolean {
  if (patron === "*") return true;
  if (patron === codigo) return true;
  const [mod, acc] = patron.split(":");
  const [cmod, cacc] = codigo.split(":");
  return mod === cmod && (acc === "*" || acc === cacc);
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@posvet.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const adminNombre = process.env.SEED_ADMIN_NOMBRE ?? "Administrador";

  console.log("→ Empresa por defecto");
  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-default" },
    update: {},
    create: {
      id: "empresa-default",
      rfc: "XAXX010101000",
      razonSocial: "POSVet Veterinaria Demo SA de CV",
      regimenFiscal: "601",
      codigoPostal: "00000",
      direccion: "Configurar en /configuracion",
    },
  });

  console.log("→ Ubicaciones (Tienda + Bodega)");
  await prisma.ubicacion.upsert({
    where: { id: "ubicacion-tienda" },
    update: {},
    create: {
      id: "ubicacion-tienda",
      empresaId: empresa.id,
      nombre: "Tienda",
      tipo: "TIENDA",
    },
  });
  await prisma.ubicacion.upsert({
    where: { id: "ubicacion-bodega" },
    update: {},
    create: {
      id: "ubicacion-bodega",
      empresaId: empresa.id,
      nombre: "Bodega",
      tipo: "BODEGA",
    },
  });

  console.log("→ Permisos");
  const todosPermisos: { codigo: string; modulo: string; accion: string }[] = [];
  for (const modulo of MODULOS) {
    for (const accion of ACCIONES) {
      todosPermisos.push({
        codigo: `${modulo}:${accion}`,
        modulo,
        accion,
      });
    }
  }
  for (const p of todosPermisos) {
    await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: p,
    });
  }

  console.log("→ Roles + asignación de permisos");
  for (const rol of ROLES) {
    const rolDb = await prisma.rol.upsert({
      where: { codigo: rol.codigo },
      update: {
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        sistema: true,
      },
      create: {
        codigo: rol.codigo,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        sistema: true,
      },
    });

    const permisosAsignar = todosPermisos.filter((p) =>
      rol.permisos.some((patron) => permisoCoincide(patron, p.codigo)),
    );

    // Borra previas y reasigna (idempotente)
    await prisma.rolPermiso.deleteMany({ where: { rolId: rolDb.id } });
    for (const p of permisosAsignar) {
      const permisoDb = await prisma.permiso.findUnique({
        where: { codigo: p.codigo },
      });
      if (!permisoDb) continue;
      await prisma.rolPermiso.create({
        data: { rolId: rolDb.id, permisoId: permisoDb.id },
      });
    }
    console.log(`   • ${rol.codigo}: ${permisosAsignar.length} permisos`);
  }

  console.log("→ Usuario administrador");
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const usuario = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { passwordHash, nombre: adminNombre, activo: true },
    create: {
      empresaId: empresa.id,
      email: adminEmail,
      nombre: adminNombre,
      passwordHash,
      activo: true,
    },
  });

  const rolAdmin = await prisma.rol.findUnique({ where: { codigo: "ADMIN" } });
  if (rolAdmin) {
    await prisma.usuarioRol.upsert({
      where: {
        usuarioId_rolId: { usuarioId: usuario.id, rolId: rolAdmin.id },
      },
      update: {},
      create: { usuarioId: usuario.id, rolId: rolAdmin.id },
    });
  }

  console.log("→ Categorías base");
  const categorias = [
    { nombre: "Antibióticos", descripcion: "Medicamentos antibióticos veterinarios" },
    { nombre: "Antiparasitarios", descripcion: "Desparasitantes internos y externos" },
    { nombre: "Alimento canino", descripcion: "Alimentos para perros" },
    { nombre: "Alimento felino", descripcion: "Alimentos para gatos" },
    { nombre: "Accesorios", descripcion: "Collares, juguetes, transportadoras" },
    { nombre: "Servicios", descripcion: "Servicios veterinarios" },
  ];
  for (const c of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: { descripcion: c.descripcion },
      create: c,
    });
  }

  console.log("→ Productos demo");
  const catAntibioticos = await prisma.categoria.findUnique({ where: { nombre: "Antibióticos" } });
  const catAntipara = await prisma.categoria.findUnique({ where: { nombre: "Antiparasitarios" } });
  const catCanino = await prisma.categoria.findUnique({ where: { nombre: "Alimento canino" } });
  const catFelino = await prisma.categoria.findUnique({ where: { nombre: "Alimento felino" } });
  const catAccesorios = await prisma.categoria.findUnique({ where: { nombre: "Accesorios" } });

  type SeedProducto = {
    sku: string;
    nombre: string;
    tipo: "MEDICAMENTO" | "ALIMENTO" | "ACCESORIO" | "SERVICIO";
    unidadMedida: string;
    categoriaId?: string;
    especie?: string;
    marca?: string;
    laboratorio?: string;
    requiereReceta?: boolean;
    costo: number;
    precios: Array<{ tipo: "PUBLICO" | "MAYOREO" | "VETERINARIO"; precio: number }>;
    lote?: { lote: string; caducidad: Date; cantidad: number };
    stockTienda: number;
    stockBodega: number;
  };

  const en12meses = new Date();
  en12meses.setMonth(en12meses.getMonth() + 12);

  const productos: SeedProducto[] = [
    {
      sku: "MED-AMOX-500",
      nombre: "Amoxicilina 500mg (caja 10 tabletas)",
      tipo: "MEDICAMENTO",
      unidadMedida: "CAJA",
      categoriaId: catAntibioticos?.id,
      especie: "Canino",
      laboratorio: "Bayer",
      requiereReceta: true,
      costo: 85,
      precios: [
        { tipo: "PUBLICO", precio: 150 },
        { tipo: "VETERINARIO", precio: 120 },
      ],
      lote: { lote: "L2026-001", caducidad: en12meses, cantidad: 50 },
      stockTienda: 30,
      stockBodega: 20,
    },
    {
      sku: "MED-IVER-10",
      nombre: "Ivermectina 1% inyectable 10ml",
      tipo: "MEDICAMENTO",
      unidadMedida: "FRASCO",
      categoriaId: catAntipara?.id,
      laboratorio: "Zoetis",
      requiereReceta: true,
      costo: 110,
      precios: [
        { tipo: "PUBLICO", precio: 190 },
        { tipo: "VETERINARIO", precio: 155 },
      ],
      lote: { lote: "L2026-002", caducidad: en12meses, cantidad: 40 },
      stockTienda: 15,
      stockBodega: 25,
    },
    {
      sku: "ALI-CAN-15K",
      nombre: "Alimento canino adulto 15kg",
      tipo: "ALIMENTO",
      unidadMedida: "BULTO",
      categoriaId: catCanino?.id,
      marca: "Royal Canin",
      especie: "Canino",
      costo: 620,
      precios: [
        { tipo: "PUBLICO", precio: 890 },
        { tipo: "MAYOREO", precio: 820 },
      ],
      lote: { lote: "L2026-A01", caducidad: en12meses, cantidad: 20 },
      stockTienda: 8,
      stockBodega: 12,
    },
    {
      sku: "ALI-FEL-7K",
      nombre: "Alimento felino adulto 7kg",
      tipo: "ALIMENTO",
      unidadMedida: "BULTO",
      categoriaId: catFelino?.id,
      marca: "Whiskas",
      especie: "Felino",
      costo: 380,
      precios: [
        { tipo: "PUBLICO", precio: 540 },
        { tipo: "MAYOREO", precio: 495 },
      ],
      lote: { lote: "L2026-A02", caducidad: en12meses, cantidad: 15 },
      stockTienda: 6,
      stockBodega: 9,
    },
    {
      sku: "ACC-COL-M",
      nombre: "Collar ajustable mediano",
      tipo: "ACCESORIO",
      unidadMedida: "PZA",
      categoriaId: catAccesorios?.id,
      costo: 45,
      precios: [
        { tipo: "PUBLICO", precio: 95 },
        { tipo: "MAYOREO", precio: 75 },
      ],
      stockTienda: 25,
      stockBodega: 50,
    },
  ];

  for (const p of productos) {
    const prod = await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {
        nombre: p.nombre,
        categoriaId: p.categoriaId ?? null,
        marca: p.marca ?? null,
        laboratorio: p.laboratorio ?? null,
        especie: p.especie ?? null,
        ultimoCosto: p.costo,
        costoPromedio: p.costo,
      },
      create: {
        sku: p.sku,
        nombre: p.nombre,
        tipo: p.tipo,
        unidadMedida: p.unidadMedida,
        categoriaId: p.categoriaId ?? null,
        marca: p.marca ?? null,
        laboratorio: p.laboratorio ?? null,
        especie: p.especie ?? null,
        requiereReceta: p.requiereReceta ?? false,
        ultimoCosto: p.costo,
        costoPromedio: p.costo,
      },
    });

    for (const precio of p.precios) {
      await prisma.productoPrecio.upsert({
        where: { productoId_tipo: { productoId: prod.id, tipo: precio.tipo } },
        update: { precio: precio.precio },
        create: { productoId: prod.id, tipo: precio.tipo, precio: precio.precio },
      });
    }

    let loteId: string | null = null;
    if (p.lote) {
      const lote = await prisma.productoLote.upsert({
        where: { productoId_lote: { productoId: prod.id, lote: p.lote.lote } },
        update: { caducidad: p.lote.caducidad, cantidad: p.lote.cantidad, costoUnitario: p.costo },
        create: {
          productoId: prod.id,
          lote: p.lote.lote,
          caducidad: p.lote.caducidad,
          cantidad: p.lote.cantidad,
          costoUnitario: p.costo,
        },
      });
      loteId = lote.id;
    }

    const ubicaciones = [
      { id: "ubicacion-tienda", stock: p.stockTienda },
      { id: "ubicacion-bodega", stock: p.stockBodega },
    ];
    for (const u of ubicaciones) {
      const inv = await prisma.inventario.upsert({
        where: { productoId_ubicacionId: { productoId: prod.id, ubicacionId: u.id } },
        update: { stock: u.stock, stockMinimo: 5 },
        create: {
          productoId: prod.id,
          ubicacionId: u.id,
          stock: u.stock,
          stockMinimo: 5,
        },
      });
      // Movimiento STOCK_INICIAL idempotente: solo lo creamos una vez por inventario.
      const yaExiste = await prisma.inventarioMovimiento.findFirst({
        where: {
          productoId: prod.id,
          ubicacionId: u.id,
          motivo: "STOCK_INICIAL",
        },
      });
      if (!yaExiste && u.stock > 0) {
        await prisma.inventarioMovimiento.create({
          data: {
            productoId: prod.id,
            ubicacionId: u.id,
            loteId,
            tipo: "ENTRADA",
            motivo: "STOCK_INICIAL",
            cantidad: u.stock,
            costoUnitario: p.costo,
            stockResultante: inv.stock,
            usuarioId: usuario.id,
            observaciones: "Stock inicial de seed",
          },
        });
      }
    }
  }

  console.log(`\n✓ Seed completo.`);
  console.log(`  Admin: ${adminEmail}  /  ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
