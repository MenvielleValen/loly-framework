import { Link } from "@lolyjs/core/components";

type ErrorPageProps = {
  error?: Error;
  statusCode?: number;
};

export default function ErrorPage({ error, statusCode = 500 }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
      <main className="flex flex-col items-center justify-center gap-8 text-center px-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-foreground">
            {statusCode === 500 ? "500" : statusCode}
          </h1>
          <h2 className="text-2xl font-semibold text-foreground">
            {statusCode === 500 ? "Something went wrong" : "Error"}
          </h2>
          <p className="max-w-md text-lg text-muted-foreground">
            {error?.message || "An unexpected error occurred. Please try again later."}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Go Home
        </Link>
      </main>
    </div>
  );
}
