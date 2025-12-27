import { ComplexHydrationExample } from "@/components/examples/ComplexHydrationExample";

export default function ComplexPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Hidratación Compleja</h1>
          <p className="text-muted-foreground">
            Este ejemplo muestra múltiples componentes de cliente anidados, cada uno con diferentes
            dependencias del cliente. Prueba que todos se hidratan correctamente.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <ComplexHydrationExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Caso de prueba:</strong> Múltiples componentes de cliente anidados con diferentes
            estrategias (ClientOnly, useClientMounted, "use client"). Todos deben hidratarse correctamente
            tanto en navegación SPA como en carga directa.
          </p>
        </div>
      </div>
    </div>
  );
}

