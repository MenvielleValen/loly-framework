import { Link } from "@loly/core/components";
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
              <CardTitle className="text-2xl">404 - Página no encontrada</CardTitle>
              <CardDescription>
                La página que buscas no existe en este universo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La ruta que intentaste acceder no existe. Puede que haya sido
            eliminada o que la URL sea incorrecta.
          </p>
        </CardContent>
        <div className="px-6 pb-6 space-y-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/planets">
              <Rocket className="mr-2 h-4 w-4" />
              Explorar planetas
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

