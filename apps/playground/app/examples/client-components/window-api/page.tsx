import { ClientOnly } from "@lolyjs/core/components";
import { WindowInfo } from "@/components/examples/WindowInfo";

export default function WindowApiPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Uso de Window API</h1>
          <p className="text-muted-foreground">
            Este componente usa <code className="bg-muted px-1 rounded">window.innerWidth</code> que no está
            disponible en el servidor. Debe usar <code className="bg-muted px-1 rounded">ClientOnly</code>.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <ClientOnly fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
            <WindowInfo />
          </ClientOnly>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Problema:</strong> Si intentas usar <code>window</code> directamente en SSR, obtendrás un error.
          </p>
          <p className="text-sm mt-2">
            <strong>Solución:</strong> Envuelve el componente en <code>ClientOnly</code> o usa <code>useClientMounted</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

