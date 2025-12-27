import { RouterContextExample } from "@/components/examples/RouterContextExample";

export default function RouterContextPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Router Context Timing</h1>
          <p className="text-muted-foreground">
            Este componente usa <code className="bg-muted px-1 rounded">useRouter()</code> que depende de
            <code className="bg-muted px-1 rounded">RouterContext</code>. Prueba que funciona tanto en
            navegación SPA como en carga directa.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <RouterContextExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problema:</strong> Durante la hidratación, RouterContext puede no estar disponible
            inmediatamente, causando errores en componentes que usan <code>useRouter()</code>.
          </p>
          <p className="text-sm">
            <strong>Solución:</strong> El framework expone <code>navigate</code> globalmente como fallback
            y <code>useRouter</code> tiene retry logic interno.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Prueba navegar a esta ruta directamente (no desde SPA) para verificar que funciona.
          </p>
        </div>
      </div>
    </div>
  );
}

