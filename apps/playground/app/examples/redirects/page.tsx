import { Link } from "@lolyjs/core/components";

type RedirectExamplesPageProps = {
  message?: string;
  redirectType?: "permanent" | "temporary" | "conditional";
};

export default function RedirectExamplesPage({ message, redirectType }: RedirectExamplesPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-between py-24 px-8 sm:px-16 md:py-32">
        <div className="w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Redirect & Not Found Examples</h1>
            <p className="text-lg text-muted-foreground">
              Examples demonstrating the use of <code className="bg-muted px-2 py-1 rounded">ctx.Redirect()</code> and{" "}
              <code className="bg-muted px-2 py-1 rounded">ctx.NotFound()</code>
            </p>
          </div>

          {message && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
              {message}
            </div>
          )}

          <div className="space-y-6">
            <section className="space-y-4 rounded-lg border border-border bg-card p-6">
              <h2 className="text-2xl font-semibold">Examples</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">1. Permanent Redirect (301)</h3>
                  <p className="text-sm text-muted-foreground">
                    Redirects permanently to a new URL. Search engines will update their index.
                  </p>
                  <Link
                    href="/examples/redirects/permanent"
                    className="inline-block rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:bg-foreground/90"
                  >
                    Try Permanent Redirect →
                  </Link>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">2. Temporary Redirect (302)</h3>
                  <p className="text-sm text-muted-foreground">
                    Redirects temporarily. The original URL should still be used.
                  </p>
                  <Link
                    href="/examples/redirects/temporary"
                    className="inline-block rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:bg-foreground/90"
                  >
                    Try Temporary Redirect →
                  </Link>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">3. Conditional Redirect</h3>
                  <p className="text-sm text-muted-foreground">
                    Redirects based on some condition (e.g., authentication, data availability).
                  </p>
                  <Link
                    href="/examples/redirects/conditional?redirect=true"
                    className="inline-block rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:bg-foreground/90"
                  >
                    Try Conditional Redirect →
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Add <code className="bg-muted px-1 py-0.5 rounded">?redirect=true</code> to trigger redirect, or remove it to see normal behavior.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">4. Not Found (404)</h3>
                  <p className="text-sm text-muted-foreground">
                    Returns a 404 Not Found response.
                  </p>
                  <Link
                    href="/examples/redirects/not-found"
                    className="inline-block rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                  >
                    Try Not Found →
                  </Link>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">5. Conditional Not Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Returns 404 based on data availability (e.g., resource doesn't exist).
                  </p>
                  <Link
                    href="/examples/redirects/item/123"
                    className="inline-block rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:bg-foreground/90"
                  >
                    Try Conditional Not Found (ID: 123) →
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Try different IDs. Only ID "999" exists as an example.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-6">
              <h2 className="text-2xl font-semibold">Code Examples</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Permanent Redirect</h3>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{`export const getServerSideProps: ServerLoader = async (ctx) => {
  return ctx.Redirect("/new-path", true); // permanent = true (301)
};`}</code>
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Temporary Redirect</h3>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{`export const getServerSideProps: ServerLoader = async (ctx) => {
  return ctx.Redirect("/new-path", false); // permanent = false (302)
};`}</code>
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Not Found</h3>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                    <code>{`export const getServerSideProps: ServerLoader = async (ctx) => {
  const item = await getItem(ctx.params.id);
  if (!item) {
    return ctx.NotFound();
  }
  return { props: { item } };
};`}</code>
                  </pre>
                </div>
              </div>
            </section>

            <div className="pt-4">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

