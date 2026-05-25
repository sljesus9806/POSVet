// El ticket se renderiza fuera del chrome del dashboard para imprimir limpio.
// Sigue siendo ruta protegida porque hereda del layout (auth) padre vía requirePermission en page.
export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
