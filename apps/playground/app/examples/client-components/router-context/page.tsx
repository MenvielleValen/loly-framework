import { RouterContextExample } from "@/components/examples/RouterContextExample.client";

export default function RouterContextPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Router Context Timing</h1>
          <p className="text-muted-foreground">
            This component uses <code className="bg-muted px-1 rounded">useRouter()</code> which depends on
            <code className="bg-muted px-1 rounded">RouterContext</code>. Tests that it works in both
            SPA navigation and direct load.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <RouterContextExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Problem:</strong> During hydration, RouterContext may not be available
            immediately, causing errors in components that use <code>useRouter()</code>.
          </p>
          <p className="text-sm">
            <strong>Solution:</strong> The framework exposes <code>navigate</code> globally as a fallback
            and <code>useRouter</code> has internal retry logic.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Try navigating to this route directly (not from SPA) to verify it works.
          </p>
        </div>
      </div>
    </div>
  );
}

