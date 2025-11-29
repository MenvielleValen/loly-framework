import { Link } from "@loly/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";

export default function ErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="max-w-md border-destructive/50 bg-card">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <CardTitle className="text-2xl">Error del Servidor</CardTitle>
              <CardDescription>
                Algo salió mal al procesar tu solicitud
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lo sentimos, ocurrió un error inesperado. Por favor, intenta
            nuevamente más tarde.
          </p>
        </CardContent>
        <div className="px-6 pb-6">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

