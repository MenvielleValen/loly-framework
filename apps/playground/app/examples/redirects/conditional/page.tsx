type ConditionalRedirectPageProps = {
  shouldRedirect?: boolean;
};

export default function ConditionalRedirectPage({ shouldRedirect }: ConditionalRedirectPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-between py-24 px-8 sm:px-16 md:py-32">
        <div className="w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Conditional Redirect Example</h1>
            <p className="text-lg text-muted-foreground">
              This page demonstrates conditional redirects based on query parameters or other conditions.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-lg">
              {shouldRedirect
                ? "You should have been redirected! If you see this, something went wrong."
                : "No redirect triggered. Add ?redirect=true to the URL to see a redirect."}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Check the server hook code to see how the conditional redirect is implemented.
            </p>
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

