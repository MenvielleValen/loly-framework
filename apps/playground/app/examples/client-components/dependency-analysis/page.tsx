import { WindowInfo } from "@/components/examples/WindowInfo.client";
import { ThemeSwitch } from "@/components/shared/theme-switch.client";
import { DependencyTree } from "@/components/examples/DependencyTree.client";

export default function DependencyAnalysisPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Dependency Analysis</h1>
          <p className="text-muted-foreground">
            This page demonstrates how the framework analyzes and preloads client component chunks.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Example 1: Direct client component */}
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Direct Import</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This component directly imports a client component.
            </p>
            <WindowInfo />
          </div>

          {/* Example 2: Multiple client components */}
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Multiple Components</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This page uses multiple client components. All are in <code className="bg-background px-1 rounded">.client.tsx</code> files
              and are handled automatically by the framework.
            </p>
            <div className="space-y-4">
              <WindowInfo />
            </div>
          </div>
        </div>

        {/* Dependency tree visualization */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Dependency Tree</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Visualization of client components detected for this route.
          </p>
          <DependencyTree />
        </div>

        {/* Technical information */}
        <div className="p-6 bg-muted/50 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Phase 1:</strong> The framework analyzes direct imports in pages and layouts.
            </p>
            <p>
              <strong>Detection:</strong> Searches for components in <code className="bg-background px-1 rounded">.client.tsx</code> files.
            </p>
            <p>
              <strong>Manifest:</strong> Generates a manifest with all client components needed per route.
            </p>
            <p>
              <strong>Preload:</strong> Injects <code className="bg-background px-1 rounded">&lt;link rel="preload"&gt;</code> for client component chunks.
            </p>
            <p>
              <strong>Code Splitting:</strong> Creates separate chunks for each client component.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

