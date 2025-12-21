type ItemPageProps = {
  item: {
    id: string;
    name: string;
    description: string;
  };
};

export default function ItemPage({ item }: ItemPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-between py-24 px-8 sm:px-16 md:py-32">
        <div className="w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Item: {item.name}</h1>
            <p className="text-lg text-muted-foreground">
              This is an example of conditional Not Found based on data availability.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>ID: {item.id}</p>
            </div>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-600 dark:text-yellow-400">
            <p className="font-semibold mb-2">Try different IDs:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>ID "999" - Returns the item (this example)</li>
              <li>Any other ID - Returns 404 Not Found</li>
            </ul>
          </div>

          <div className="pt-4">
            <a
              href="/examples/redirects"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Examples
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

