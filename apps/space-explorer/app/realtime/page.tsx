import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@lolyjs/core/components";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, TrendingUp, Zap } from "lucide-react";

export default function RealtimePage() {
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Realtime Features</h1>
        <p className="text-muted-foreground text-lg">
          Demostraciones de WebSockets con Loly Realtime v1
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <CardTitle>Counter</CardTitle>
            </div>
            <CardDescription>
              State store compartido, schema validation, rate limiting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Demostración de un contador compartido que funciona entre múltiples clientes
              y instancias del servidor. Usa state store (Redis en cluster mode) para mantener
              consistencia.
            </p>
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>✅ State store compartido</li>
              <li>✅ Schema validation (Zod)</li>
              <li>✅ Rate limiting</li>
              <li>✅ Broadcast entre clientes</li>
            </ul>
            <Link
              href="/realtime/counter"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Ver Counter Demo
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <CardTitle>Chat</CardTitle>
            </div>
            <CardDescription>
              Auth hooks, rooms, presence, message history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Chat en tiempo real con soporte para salas (rooms), autenticación,
              historial de mensajes y presencia de usuarios.
            </p>
            <ul className="text-sm space-y-1 mb-4 text-muted-foreground">
              <li>✅ Auth hooks</li>
              <li>✅ Rooms (salas)</li>
              <li>✅ Message history</li>
              <li>✅ Presence tracking</li>
              <li>✅ Private messages (toUser)</li>
            </ul>
            <Link
              href="/realtime/chat"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Ver Chat Demo
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <CardTitle>Características de Producción</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Seguridad</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Autenticación con hooks</li>
                <li>• Guards para permisos</li>
                <li>• Schema validation</li>
                <li>• Rate limiting global y por evento</li>
                <li>• CORS configurable</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Escalabilidad</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Redis adapter para multi-instancia</li>
                <li>• State store compartido (Redis)</li>
                <li>• Presence tracking distribuido</li>
                <li>• Broadcast entre instancias</li>
                <li>• toUser() funciona en cluster</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Developer Experience</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• TypeScript completo</li>
                <li>• File-based routing</li>
                <li>• Logging con contexto</li>
                <li>• Error handling estructurado</li>
                <li>• API simple y declarativa</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Rooms (salas)</li>
                <li>• User targeting (toUser)</li>
                <li>• Message history</li>
                <li>• Presence management</li>
                <li>• Connection/disconnection hooks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
