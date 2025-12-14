# WebSockets (WSS) - Realtime v1

**Característica exclusiva de Loly Framework**: Soporte nativo y completo para WebSockets usando Socket.IO, integrado directamente en el sistema de routing. **Nueva API de producción (Realtime v1)** con autenticación, validación, rate limiting, y soporte multi-instancia.

Permite comunicación en tiempo real bidireccional entre cliente y servidor con una API simple, declarativa y lista para producción.

## ⚠️ Breaking Change

**La API legacy `export const events = []` ya no está soportada.** Debes usar la nueva API `defineWssRoute()`:

```tsx
// ❌ ANTES (ya no funciona)
export const events = [
  { name: "message", handler: (ctx) => { ... } }
];

// ✅ AHORA (nuevo formato)
import { defineWssRoute } from "@lolyjs/core";

export default defineWssRoute({
  events: {
    message: {
      handler: (ctx) => { ... }
    }
  }
});
```

## Conceptos Básicos

### Namespaces con Routing Automático

Los WebSockets se organizan en namespaces que se crean automáticamente basándose en la estructura de archivos:

```
app/wss/chat/events.ts        → Namespace: /chat (automático)
app/wss/notifications/events.ts → Namespace: /notifications (automático)
app/wss/game/[roomId]/events.ts → Namespace: /game/:roomId (con parámetros dinámicos)
```

### Nueva API: defineWssRoute()

La nueva API proporciona características de producción:

```tsx
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  // Hook de autenticación
  auth: async (ctx) => {
    const token = ctx.req.headers.authorization;
    return await verifyToken(token); // Retorna user o null
  },

  // Hook de conexión
  onConnect: (ctx) => {
    console.log("Usuario conectado:", ctx.user?.id);
  },

  // Hook de desconexión
  onDisconnect: (ctx, reason) => {
    console.log("Usuario desconectado:", ctx.user?.id, reason);
  },

  // Event handlers
  events: {
    message: {
      // Validación de schema (Zod/Valibot)
      schema: z.object({
        text: z.string().min(1).max(500),
      }),
      
      // Guard (verificación de permisos)
      guard: ({ user }) => !!user, // Requiere autenticación
      
      // Rate limiting por evento
      rateLimit: {
        eventsPerSecond: 10,
        burst: 20,
      },
      
      // Handler
      handler: (ctx) => {
        ctx.actions.broadcast("message", {
          text: ctx.data.text,
          from: ctx.user?.id,
        });
      },
    },
  },
});
```

## WssContext Extendido

El contexto ahora incluye más información:

```typescript
interface WssContext<TData = any, TUser = any> {
  // Socket.IO
  io: Server;
  socket: Socket;

  // Request metadata
  req: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    url?: string;
    cookies?: Record<string, string>;
  };

  // Usuario autenticado (seteado por auth hook)
  user: TUser | null;

  // Datos del evento
  data: TData;

  // Parámetros de ruta
  params: Record<string, string>;
  pathname: string;

  // Utilidades del framework
  actions: WssActions;
  state: RealtimeStateStore;  // State store compartido
  log: RealtimeLogger;        // Logger con contexto
}
```

### WssActions Mejorado

```typescript
interface WssActions {
  // Emitir al socket actual (reply)
  reply(event: string, payload?: any): void;

  // Emitir a todos en el namespace
  emit(event: string, payload?: any): void;

  // Broadcast a todos excepto el emisor
  broadcast(event: string, payload?: any, opts?: { excludeSelf?: boolean }): void;

  // Unirse a un room
  join(room: string): Promise<void>;

  // Salir de un room
  leave(room: string): Promise<void>;

  // Emitir a un room específico
  toRoom(room: string): {
    emit(event: string, payload?: any): void;
  };

  // Emitir a un usuario específico (por userId)
  toUser(userId: string): {
    emit(event: string, payload?: any): void;
  };

  // Emitir error (evento reservado: __loly:error)
  error(code: string, message: string, details?: any): void;
}
```

## Características de Producción

### 1. Autenticación

El hook `auth` se ejecuta antes de `onConnect`:

```tsx
export default defineWssRoute({
  auth: async (ctx) => {
    // Verificar token JWT
    const token = ctx.req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    
    const user = await verifyJWT(token);
    return user; // o null si no autenticado
  },
  
  events: {
    // ...
  },
});
```

### 2. Validación de Schemas

Usa Zod o Valibot para validar datos:

```tsx
import { z } from "zod";

export default defineWssRoute({
  events: {
    message: {
      schema: z.object({
        text: z.string().min(1).max(500),
        roomId: z.string().uuid(),
      }),
      handler: (ctx) => {
        // ctx.data está validado y tipado
        console.log(ctx.data.text); // TypeScript sabe que es string
      },
    },
  },
});
```

Si el schema falla, se emite automáticamente `__loly:error` con código `BAD_PAYLOAD`.

### 3. Guards (Permisos)

Los guards verifican permisos antes de ejecutar el handler:

```tsx
export default defineWssRoute({
  events: {
    "admin-action": {
      guard: ({ user }) => user?.role === "admin",
      handler: (ctx) => {
        // Solo admins pueden ejecutar esto
      },
    },
    
    "user-action": {
      guard: ({ user }) => !!user, // Requiere autenticación
      handler: (ctx) => {
        // Usuarios autenticados
      },
    },
  },
});
```

Si el guard retorna `false`, se emite `__loly:error` con código `FORBIDDEN`.

### 4. Rate Limiting

Rate limiting global y por evento:

```tsx
export default defineWssRoute({
  events: {
    "spam-prone": {
      rateLimit: {
        eventsPerSecond: 5,  // Máximo 5 por segundo
        burst: 10,           // Permite ráfagas de hasta 10
      },
      handler: (ctx) => {
        // ...
      },
    },
  },
});
```

Si se excede el límite, se emite `__loly:error` con código `RATE_LIMIT`.

### 5. State Store Compartido

Accede a estado compartido entre instancias (en cluster mode):

```tsx
export default defineWssRoute({
  events: {
    increment: {
      handler: async (ctx) => {
        // Incrementar contador (funciona en cluster con Redis)
        const count = await ctx.state.incr("counter:global");
        ctx.actions.emit("counter-update", { count });
      },
    },
  },
});
```

### 6. Targeting por Usuario

Envía mensajes a usuarios específicos usando `toUser()`:

```tsx
export default defineWssRoute({
  events: {
    "private-message": {
      handler: (ctx) => {
        // Enviar a usuario específico (funciona en cluster)
        ctx.actions.toUser(ctx.data.toUserId).emit("private-message", {
          from: ctx.user?.id,
          text: ctx.data.text,
        });
      },
    },
  },
});
```

### 7. Rooms

Usa rooms para agrupar conexiones:

```tsx
export default defineWssRoute({
  events: {
    "join-room": {
      handler: async (ctx) => {
        await ctx.actions.join(ctx.data.roomId);
        // Notificar al room
        ctx.actions.toRoom(ctx.data.roomId).emit("user-joined", {
          userId: ctx.user?.id,
        });
      },
    },
    
    "room-message": {
      handler: (ctx) => {
        // Enviar a todos en el room
        ctx.actions.toRoom(ctx.data.roomId).emit("message", {
          from: ctx.user?.id,
          text: ctx.data.text,
        });
      },
    },
  },
});
```

## Configuración

### loly.config.ts

```tsx
import { defineConfig } from "@lolyjs/core";

export default defineConfig({
  server: {
    // ... otras configs
  },
  realtime: {
    enabled: true,
    
    // Socket.IO settings
    path: "/wss",
    transports: ["websocket", "polling"],
    pingIntervalMs: 25000,
    pingTimeoutMs: 20000,
    maxPayloadBytes: 64 * 1024,
    
    // Security
    allowedOrigins: process.env.NODE_ENV === "production" 
      ? ["https://tu-dominio.com"] 
      : "*",
    cors: {
      credentials: true,
      allowedHeaders: ["content-type", "authorization"],
    },
    
    // Scaling (multi-instancia)
    scale: {
      mode: "cluster", // o "single"
      adapter: {
        name: "redis",
        url: process.env.REDIS_URL!,
      },
      stateStore: {
        name: "redis", // o "memory"
        url: process.env.REDIS_URL!,
        prefix: "loly:rt:",
      },
    },
    
    // Rate limiting
    limits: {
      connectionsPerIp: 20,
      eventsPerSecond: 30,
      burst: 60,
    },
    
    // Logging
    logging: {
      level: "info", // "debug" | "info" | "warn" | "error"
      pretty: process.env.NODE_ENV !== "production",
    },
  },
});
```

## Cliente React

### Conexión Básica

```tsx
import { lolySocket } from "@lolyjs/core/sockets";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export default function ChatComponent() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socketInstance = lolySocket("/chat", {
      auth: {
        token: "tu-jwt-token", // Para auth hook
      },
    });
    
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected");
    });

    socketInstance.on("message", (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Escuchar errores del framework
    socketInstance.on("__loly:error", (error) => {
      console.error("Error:", error.code, error.message);
    });

    return () => {
      socketInstance.close();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (socket && socket.connected) {
      socket.emit("message", { text });
    }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.text}</div>
      ))}
      <button onClick={() => sendMessage("Hello")}>Send</button>
    </div>
  );
}
```

## Ejemplo Completo: Chat con Counter

### Servidor

```tsx
// app/wss/counter/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  onConnect: async (ctx) => {
    // Obtener valor inicial del counter
    const count = await ctx.state.get<number>("counter:value") || 0;
    ctx.actions.reply("counter-state", { count });
  },

  events: {
    increment: {
      schema: z.object({ by: z.number().int().min(1).max(10).default(1) }),
      handler: async (ctx) => {
        const by = ctx.data.by || 1;
        const newCount = await ctx.state.incr("counter:value", by);
        
        // Broadcast a todos
        ctx.actions.broadcast("counter-update", { count: newCount });
      },
    },
    
    decrement: {
      schema: z.object({ by: z.number().int().min(1).max(10).default(1) }),
      handler: async (ctx) => {
        const by = ctx.data.by || 1;
        const newCount = await ctx.state.decr("counter:value", by);
        
        ctx.actions.broadcast("counter-update", { count: newCount });
      },
    },
    
    "get-users": {
      handler: async (ctx) => {
        // Obtener lista de usuarios conectados (presence)
        const userIds = await ctx.state.setMembers("counter:users");
        ctx.actions.reply("users-list", { users: userIds });
      },
    },
  },
});
```

### Cliente

```tsx
import { lolySocket } from "@lolyjs/core/sockets";
import { useEffect, useState } from "react";

export default function Counter() {
  const [socket, setSocket] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const s = lolySocket("/counter");
    setSocket(s);

    s.on("counter-state", (data) => setCount(data.count));
    s.on("counter-update", (data) => setCount(data.count));

    return () => s.close();
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => socket?.emit("increment", { by: 1 })}>
        +1
      </button>
      <button onClick={() => socket?.emit("decrement", { by: 1 })}>
        -1
      </button>
    </div>
  );
}
```

## Multi-instancia (Cluster Mode)

Para escalar horizontalmente, configura Redis:

```tsx
// loly.config.ts
export default defineConfig({
  realtime: {
    scale: {
      mode: "cluster",
      adapter: {
        name: "redis",
        url: process.env.REDIS_URL!, // redis://localhost:6379
      },
      stateStore: {
        name: "redis",
        url: process.env.REDIS_URL!,
        prefix: "loly:rt:",
      },
    },
  },
});
```

**Beneficios:**
- Broadcast funciona entre instancias
- State store compartido (counter, presence, etc.)
- `toUser()` funciona en cualquier instancia
- Presence consistente en cluster

## Manejo de Errores

El framework emite errores estructurados:

```tsx
socket.on("__loly:error", (error) => {
  console.error(error.code);    // "BAD_PAYLOAD", "RATE_LIMIT", "FORBIDDEN", etc.
  console.error(error.message); // Mensaje descriptivo
  console.error(error.details); // Detalles adicionales (opcional)
  console.error(error.requestId); // ID para debugging
});
```

## Mejores Prácticas

1. **Usa schemas**: Valida todos los datos de entrada
2. **Implementa guards**: Protege eventos sensibles
3. **Configura rate limits**: Previene abuso
4. **Usa state store**: Para estado compartido en cluster
5. **Maneja errores**: Escucha `__loly:error` en el cliente
6. **Type safety**: Tipa tus eventos y datos
7. **Logging**: Usa `ctx.log` para debugging

## Migración desde Legacy API

Si tienes código con `export const events = []`:

**Antes:**
```tsx
export const events = [
  {
    name: "connection",
    handler: (ctx) => {
      console.log("Connected");
    },
  },
  {
    name: "message",
    handler: (ctx) => {
      ctx.actions.broadcast("message", ctx.data);
    },
  },
];
```

**Después:**
```tsx
import { defineWssRoute } from "@lolyjs/core";

export default defineWssRoute({
  onConnect: (ctx) => {
    console.log("Connected");
  },
  events: {
    message: {
      handler: (ctx) => {
        ctx.actions.broadcast("message", ctx.data);
      },
    },
  },
});
```

## Próximos Pasos

- [API Routes](./05-api-routes.md) - Endpoints REST
- [Configuración](./12-configuracion.md) - Configuración completa
- [Validación](./09-validation.md) - Schemas y validación
