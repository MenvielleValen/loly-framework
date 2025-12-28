import { DOMMeasurementsExample } from "@/components/examples/DOMMeasurementsExample.client";

export default function DOMMeasurementsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">DOM Measurements</h1>
          <p className="text-muted-foreground">
            This component measures DOM elements using <code className="bg-muted px-1 rounded">useIsomorphicLayoutEffect</code>.
            Measurements must be synchronous to avoid layout shifts.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <DOMMeasurementsExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problem:</strong> <code>useLayoutEffect</code> doesn't work in SSR and causes warnings.
          </p>
          <p className="text-sm">
            <strong>Solution:</strong> Use <code>useIsomorphicLayoutEffect</code> which uses <code>useLayoutEffect</code>
            on the client and <code>useEffect</code> (no-op) on the server.
          </p>
        </div>
      </div>
    </div>
  );
}

