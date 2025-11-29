export default function ErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">500</h1>
        <p className="text-muted-foreground">Something went wrong.</p>
        <a
          href="/"
          className="inline-block rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Go back home
        </a>
      </div>
    </main>
  );
}
