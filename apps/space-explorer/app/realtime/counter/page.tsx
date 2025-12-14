"use client";

import { useEffect, useState } from "react";
import { lolySocket } from "@lolyjs/core/sockets";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CounterState {
  count: number;
  increment?: number;
  decrement?: number;
  reset?: boolean;
  timestamp: number;
}

export default function CounterPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [count, setCount] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<number>(0);

  useEffect(() => {
    const socketInstance = lolySocket("/counter");
    setSocket(socketInstance);

    // Connection events
    socketInstance.on("connect", () => {
      setConnected(true);
      setError(null);
      console.log("✅ Connected to counter namespace");
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
      console.log("❌ Disconnected from counter namespace");
    });

    // Counter events
    socketInstance.on("counter-state", (data: { count: number }) => {
      setCount(data.count);
      console.log("📊 Initial counter state:", data.count);
    });

    socketInstance.on("counter-update", (data: CounterState) => {
      setCount(data.count);
      console.log("🔄 Counter updated:", data);
    });

    socketInstance.on("users-list", (data: { connected: number }) => {
      setConnectedUsers(data.connected);
    });

    // Error handling
    socketInstance.on("__loly:error", (error: any) => {
      setError(`${error.code}: ${error.message}`);
      console.error("❌ Error:", error);
    });

    return () => {
      socketInstance.close();
    };
  }, []);

  const handleIncrement = (by: number = 1) => {
    if (socket && connected) {
      socket.emit("increment", { by });
    }
  };

  const handleDecrement = (by: number = 1) => {
    if (socket && connected) {
      socket.emit("decrement", { by });
    }
  };

  const handleReset = () => {
    if (socket && connected) {
      socket.emit("reset", {});
    }
  };

  const handleGetUsers = () => {
    if (socket && connected) {
      socket.emit("get-users", {});
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Realtime Counter</h1>
        <p className="text-muted-foreground">
          Demostración de WebSockets con state store compartido
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Counter</CardTitle>
            <CardDescription>
              Estado compartido entre todas las conexiones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold mb-4">{count}</div>
              <div className="text-sm text-muted-foreground">
                {connected ? "🟢 Conectado" : "🔴 Desconectado"}
              </div>
              {connectedUsers > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  {connectedUsers} usuario{connectedUsers !== 1 ? "s" : ""} conectado{connectedUsers !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleDecrement(5)}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                -5
              </button>
              <button
                onClick={() => handleDecrement(1)}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                -1
              </button>
              <button
                onClick={handleReset}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Reset
              </button>
              <button
                onClick={() => handleIncrement(1)}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                +1
              </button>
              <button
                onClick={() => handleIncrement(5)}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                +5
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGetUsers}
                disabled={!connected}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Actualizar usuarios
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Características</CardTitle>
            <CardDescription>
              Funcionalidades demostradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ State store compartido (Redis en cluster)</li>
              <li>✅ Schema validation (Zod)</li>
              <li>✅ Rate limiting (5 eventos/segundo)</li>
              <li>✅ Broadcast entre clientes</li>
              <li>✅ Logging con contexto</li>
              <li>✅ Error handling estructurado</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instrucciones</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Abre esta página en múltiples pestañas/navegadores</li>
            <li>Incrementa o decrementa el counter en una pestaña</li>
            <li>Observa cómo se actualiza en todas las pestañas</li>
            <li>El estado se mantiene incluso si recargas la página</li>
            <li>En cluster mode, funciona entre diferentes instancias del servidor</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
