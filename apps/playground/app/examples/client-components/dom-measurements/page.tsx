import { DOMMeasurementsExample } from "@/components/examples/DOMMeasurementsExample";

export default function DOMMeasurementsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Mediciones del DOM</h1>
          <p className="text-muted-foreground">
            Este componente mide elementos del DOM usando <code className="bg-muted px-1 rounded">useIsomorphicLayoutEffect</code>.
            Las mediciones deben ser síncronas para evitar layout shifts.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <DOMMeasurementsExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problema:</strong> <code>useLayoutEffect</code> no funciona en SSR y causa warnings.
          </p>
          <p className="text-sm">
            <strong>Solución:</strong> Usa <code>useIsomorphicLayoutEffect</code> que usa <code>useLayoutEffect</code>
            en el cliente y <code>useEffect</code> (no-op) en el servidor.
          </p>
        </div>
      </div>
    </div>
  );
}

