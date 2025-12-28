import { Link } from "@lolyjs/core/components";

export default function ClientComponentsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Client Components Examples
          </h1>
          <p className="text-muted-foreground text-lg">
            Examples of client components and edge cases to test the
            hydration system.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            title="Client File Suffix"
            description="Component defined in .client.tsx file that renders as placeholder in SSR"
            href="/examples/client-components/use-client"
          />
          <Card
            title="Window API"
            description="Component that uses window.innerWidth from a .client.tsx file"
            href="/examples/client-components/window-api"
          />
          <Card
            title="LocalStorage"
            description="Component that uses localStorage - common hydration issue"
            href="/examples/client-components/localstorage"
          />
          <Card
            title="Router Context"
            description="Component that uses useRouter() - tests RouterContext timing"
            href="/examples/client-components/router-context"
          />
          <Card
            title="DOM Measurements"
            description="Component that measures the DOM - uses useIsomorphicLayoutEffect"
            href="/examples/client-components/dom-measurements"
          />
          <Card
            title="Complex Hydration"
            description="Multiple nested client components - complex case"
            href="/examples/client-components/complex"
          />
          <Card
            title="SPA vs Direct Load"
            description="Compares behavior in SPA navigation vs direct load"
            href="/examples/client-components/spa-vs-direct"
          />
          <Card
            title="Theme Switch"
            description="Comparison between theme switch versions with .client.tsx files"
            href="/examples/client-components/theme-switch"
          />
          <Card
            title="Suspense Islands"
            description="Suspense boundaries with lazy vs immediate islands"
            href="/examples/client-components/suspense"
          />
          <Card
            title="Client Error Boundary"
            description="Catches errors in islands without breaking server render"
            href="/examples/client-components/error-boundary"
          />
          <Card
            title="Barrel Re-exports"
            description="Islands imported from a barrel index.ts"
            href="/examples/client-components/barrel-reexports"
          />
          <Card
            title="Multi Export"
            description="Default + named exports in the same .client.tsx"
            href="/examples/client-components/multi-export"
          />
          <Card
            title="Context Bridge"
            description="Server data + client state shared via context"
            href="/examples/client-components/context-bridge"
          />
          <Card
            title="Server-to-Client Data Flow"
            description="Passes complex data from page.server.hook to client components"
            href="/examples/client-components/server-to-client"
          />
          <Card
            title="Section Wrapper"
            description="Wraps a component in a section with a title"
            href="/examples/client-components/nested-components"
          />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
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
