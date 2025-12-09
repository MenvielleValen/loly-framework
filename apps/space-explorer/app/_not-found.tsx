import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Home, Rocket } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="max-w-md border-border bg-card">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3">
            <Search className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-2xl">404 - Page not found</CardTitle>
              <CardDescription>
                The page you're looking for doesn't exist in this universe
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The route you tried to access doesn't exist. It may have been
            removed or the URL is incorrect.
          </p>
        </CardContent>
        <div className="px-6 pb-6 space-y-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Return to home
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/planets">
              <Rocket className="mr-2 h-4 w-4" />
              Explore planets
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

