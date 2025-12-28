import { ImprovedThemeSwitch } from "@/components/examples/ImprovedThemeSwitch.client";

export default function ThemeSwitchPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Improved Theme Switch</h1>
          <p className="text-muted-foreground">
            Comparison between the original theme switch and the improved version using the global theme API.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Original Version</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uses <code className="bg-muted px-1 rounded">useClientMounted</code> manually.
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Improved Version</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uses the global <code className="bg-muted px-1 rounded">loly.theme</code> API with BroadcastChannel for cross-tab sync.
            </p>
            <ImprovedThemeSwitch />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Improvement:</strong> The improved version uses the global <code>loly.theme</code> API which works without React Context and synchronizes across tabs automatically.
          </p>
          <p className="text-sm">
            Both versions work correctly, but the global API is cleaner and doesn't require wrapping your app in a provider.
          </p>
        </div>
      </div>
    </div>
  );
}

