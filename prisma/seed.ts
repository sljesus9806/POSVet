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
