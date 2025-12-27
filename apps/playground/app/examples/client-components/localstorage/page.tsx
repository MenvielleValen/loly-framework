import { ClientOnly } from "@lolyjs/core/components";
import { LocalStorageCounter } from "@/components/examples/LocalStorageCounter";

export default function LocalStoragePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Uso de LocalStorage</h1>
          <p className="text-muted-foreground">
            Este componente usa <code className="bg-muted px-1 rounded">localStorage</code> que no está
            disponible en el servidor. Es un caso común de problemas de hidratación.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <ClientOnly fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
            <LocalStorageCounter />
          </ClientOnly>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problema:</strong> localStorage solo existe en el cliente. Si intentas leerlo en SSR,
            obtendrás un error o valores incorrectos.
          </p>
          <p className="text-sm">
            <strong>Solución:</strong> Usa <code>ClientOnly</code> o <code>useClientMounted</code> para
            asegurar que solo se acceda a localStorage en el cliente.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Recarga la página directamente (no navegación SPA) para probar que funciona correctamente.
          </p>
        </div>
      </div>
    </div>
  );
}

