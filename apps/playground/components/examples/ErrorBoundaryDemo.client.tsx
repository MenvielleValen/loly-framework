import React, { useState } from "react";

class ClientErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    // Could log to client logger here
    this.setState({ hasError: true, error: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="font-semibold text-destructive">Client error boundary captured an error</div>
          <p className="text-destructive">Message: {this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundaryDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The boundary is a client component. The error is thrown inside another client island after interaction.
      </p>
      <ClientErrorBoundary>
        <ExplodingWidget />
      </ClientErrorBoundary>
      <StableWidget />
    </div>
  );
}

function ExplodingWidget() {
  const [shouldBlow, setShouldBlow] = useState(false);

  if (shouldBlow) {
    throw new Error("Boom! Client-only failure.");
  }

  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="font-medium">Exploding widget</div>
      <p className="text-sm text-muted-foreground">
        Click the button to trigger a client-side error; the boundary should catch it without breaking the page.
      </p>
      <button
        className="px-3 py-2 rounded bg-destructive text-destructive-foreground text-sm"
        onClick={() => setShouldBlow(true)}
      >
        Trigger error
      </button>
    </div>
  );
}

function StableWidget() {
  const [count, setCount] = useState(0);
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="font-medium">Healthy widget (control)</div>
      <p className="text-sm text-muted-foreground">This shows unaffected client islands stay mounted.</p>
      <button
        className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm"
        onClick={() => setCount((c) => c + 1)}
      >
        Increment ({count})
      </button>
    </div>
  );
}

