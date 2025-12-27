import { Link } from "@lolyjs/core/components";

export default function ClientComponentsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-4">Client Components Examples</h1>
          <p className="text-muted-foreground text-lg">
            Ejemplos de componentes de cliente y casos límite para probar el sistema de hidratación.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            title="use client Directive"
            description="Componente marcado con 'use client' que se renderiza como placeholder en SSR"
            href="/examples/client-components/use-client"
          />
          <Card
            title="Window API"
            description="Componente que usa window.innerWidth - debe usar ClientOnly"
            href="/examples/client-components/window-api"
          />
          <Card
            title="LocalStorage"
            description="Componente que usa localStorage - problema común de hidratación"
            href="/examples/client-components/localstorage"
          />
          <Card
            title="Router Context"
            description="Componente que usa useRouter() - prueba timing de RouterContext"
            href="/examples/client-components/router-context"
          />
          <Card
            title="DOM Measurements"
            description="Componente que mide el DOM - usa useIsomorphicLayoutEffect"
            href="/examples/client-components/dom-measurements"
          />
          <Card
            title="Complex Hydration"
            description="Múltiples componentes de cliente anidados - caso complejo"
            href="/examples/client-components/complex"
          />
          <Card
            title="SPA vs Direct Load"
            description="Compara comportamiento en navegación SPA vs carga directa"
            href="/examples/client-components/spa-vs-direct"
          />
          <Card
            title="Theme Switch"
            description="Versión mejorada del theme switch usando nuevas utilidades"
            href="/examples/client-components/theme-switch"
          />
        </div>
      </div>
    </div>
  );
}

function Card({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-6 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

