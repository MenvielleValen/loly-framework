import { SPAVsDirectExample } from "@/components/examples/SPAVsDirectExample";

export default function SPAVsDirectPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">SPA vs Carga Directa</h1>
          <p className="text-muted-foreground">
            Este ejemplo compara el comportamiento de componentes de cliente en navegación SPA
            (client-side) vs carga directa por ruta (server-side). Ambos deben funcionar correctamente.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <SPAVsDirectExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problema común:</strong> Los componentes funcionan bien en navegación SPA pero
            fallan cuando se accede directamente a la ruta.
          </p>
          <p className="text-sm">
            <strong>Causa:</strong> En carga directa, el componente se renderiza en el servidor primero,
            y luego se hidrata en el cliente. Si hay diferencias, se producen errores.
          </p>
          <p className="text-sm">
            <strong>Solución:</strong> Usa las utilidades del framework (ClientOnly, useClientMounted, etc.)
            para manejar correctamente ambos casos.
          </p>
        </div>
      </div>
    </div>
  );
}

