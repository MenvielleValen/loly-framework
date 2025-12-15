import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@lolyjs/core/components";

type ErrorPageProps = {
  error?: Error;
  statusCode?: number;
};

export default function ErrorPage({ error, statusCode = 500 }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="mx-auto max-w-md border-border/70 bg-card/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {statusCode === 500 ? "Something went wrong" : `Error ${statusCode}`}
          </CardTitle>
          <CardDescription>
            {error?.message || "An unexpected error occurred. Please try again later."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/" className={cn(buttonVariants())}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
