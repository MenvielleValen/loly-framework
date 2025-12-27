import { ClientOnly } from "@lolyjs/core/components";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { ImprovedThemeSwitch } from "@/components/examples/ImprovedThemeSwitch";

export default function ThemeSwitchPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Theme Switch Mejorado</h1>
          <p className="text-muted-foreground">
            Comparación entre el theme switch original y la versión mejorada usando las nuevas utilidades.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Versión Original</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Usa <code className="bg-muted px-1 rounded">useClientMounted</code> manualmente.
            </p>
            <ThemeSwitch />
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Versión Mejorada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Usa <code className="bg-muted px-1 rounded">ClientOnly</code> para mejor encapsulación.
            </p>
            <ClientOnly fallback={<div className="h-9 w-16 rounded-full bg-muted" />}>
              <ImprovedThemeSwitch />
            </ClientOnly>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Mejora:</strong> La versión mejorada usa <code>ClientOnly</code> que es más declarativo
            y maneja automáticamente el estado de montaje.
          </p>
          <p className="text-sm">
            Ambas versiones funcionan correctamente, pero <code>ClientOnly</code> es más limpio para
            componentes que solo deben renderizarse en el cliente.
          </p>
        </div>
      </div>
    </div>
  );
}

