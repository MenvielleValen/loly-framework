import { SPAVsDirectExample } from "@/components/examples/SPAVsDirectExample.client";

export default function SPAVsDirectPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">SPA vs Direct Load</h1>
          <p className="text-muted-foreground">
            This example compares the behavior of client components in SPA navigation
            (client-side) vs direct route load (server-side). Both should work correctly.
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <SPAVsDirectExample />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Common problem:</strong> Components work well in SPA navigation but
            fail when accessing the route directly.
          </p>
          <p className="text-sm">
            <strong>Cause:</strong> In direct load, the component renders on the server first,
            then hydrates on the client. If there are differences, errors occur.
          </p>
          <p className="text-sm">
            <strong>Solution:</strong> Use framework utilities (ClientOnly, useClientMounted, etc.)
            to handle both cases correctly.
          </p>
        </div>
      </div>
    </div>
  );
}

