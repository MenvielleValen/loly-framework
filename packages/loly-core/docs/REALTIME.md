# Loly Realtime v1 - Guía Completa

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Configuración Básica](#configuración-básica)
- [Crear Rutas WebSocket](#crear-rutas-websocket)
- [Cliente WebSocket](#cliente-websocket)
- [Configuración Avanzada](#configuración-avanzada)
- [Multi-Instancia (Cluster)](#multi-instancia-cluster)
- [Ejemplos Completos](#ejemplos-completos)
- [Troubleshooting](#troubleshooting)

---

## Introducción

Loly Realtime v1 es un sistema de WebSockets listo para producción que incluye:

- ✅ **Autenticación integrada** - Hooks de auth por namespace
- ✅ **Validación de schemas** - Zod/Valibot integrado
- ✅ **Rate limiting** - Global y por evento
- ✅ **Guards** - Control de permisos por evento
- ✅ **State Store** - Estado compartido (memory/Redis)
- ✅ **Presence** - Mapeo usuario-socket para mensajería dirigida
- ✅ **Multi-instancia** - Escalado horizontal con Redis adapter
- ✅ **Logging** - Logger especializado para eventos WSS
- ✅ **Type-safe** - Soporte completo de TypeScript
- ✅ **File-based routing** - Mismo patrón que páginas y APIs

**⚠️ Breaking Change:** El formato legacy `export const events = []` ya no está soportado. Usa `defineWssRoute()`.

---

## Configuración Básica

### 1. Habilitar Realtime en `loly.config.ts`

Por defecto, Realtime está habilitado. No necesitas configuración adicional para desarrollo local:

```ts
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    // Realtime está habilitado por defecto
    // No necesitas configurar nada para desarrollo local
  };
};
```

### 2. Configuración para Producción

Para producción, configura los orígenes permitidos:

```ts
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

const DEFAULT_CONFIG: ServerConfig = {
  bodyLimit: "1mb",
  corsOrigin: "*",
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    strictMax: 5,
    strictPatterns: ["/api/auth/**"],
  },
};

const PROD_CONFIG: ServerConfig = {
  corsOrigin: ["https://tu-dominio.com"],
  realtime: {
    enabled: true,
    allowedOrigins: ["https://tu-dominio.com"],
  },
};

export const config = (env: string): ServerConfig => {
  const isDev = env === "development";
  return {
    ...DEFAULT_CONFIG,
    ...(isDev ? {} : PROD_CONFIG),
  };
};
```

**Nota:** Para desarrollo local, el framework automáticamente permite `localhost` en cualquier puerto, así que no necesitas configurar `allowedOrigins` a menos que despliegues a producción real.

---

## Crear Rutas WebSocket

### Estructura de Archivos

Las rutas WebSocket siguen el mismo patrón de file-based routing que las páginas y APIs:

```
app/
└── wss/
    ├── chat/
    │   └── events.ts          # Namespace: /chat
    ├── notifications/
    │   └── events.ts          # Namespace: /notifications
    └── game/
        └── [roomId]/
            └── events.ts      # Namespace: /game/:roomId
```

### API Básica: `defineWssRoute()`

```ts
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  // 1. Auth Hook (opcional)
  auth: async (ctx) => {
    const token = ctx.req.headers.authorization;
    if (!token) return null;
    
    // Verificar token y retornar usuario
    const user = await verifyToken(token);
    return user; // { id: string, name: string, ... } o null
  },

  // 2. Connection Hook (opcional)
  onConnect: async (ctx) => {
    console.log("Usuario conectado:", ctx.user?.id);
    
    // Enviar mensaje de bienvenida
    ctx.actions.reply("welcome", {
      message: "Bienvenido al chat",
      userId: ctx.user?.id,
    });
  },

  // 3. Disconnection Hook (opcional)
  onDisconnect: (ctx, reason) => {
    console.log("Usuario desconectado:", ctx.user?.id, reason);
  },

  // 4. Event Handlers
  events: {
    // Evento simple sin validación
    "ping": {
      handler: (ctx) => {
        ctx.actions.reply("pong", { timestamp: Date.now() });
      },
    },

    // Evento con validación de schema
    "message": {
      schema: z.object({
        text: z.string().min(1).max(500),
        roomId: z.string().optional(),
      }),
      handler: (ctx) => {
        // ctx.data está validado según el schema
        ctx.actions.broadcast("message", {
          text: ctx.data.text,
          from: ctx.user?.id,
        });
      },
    },

    // Evento con guard (requiere autenticación)
    "private-message": {
      schema: z.object({
        toUserId: z.string(),
        text: z.string().min(1),
      }),
      guard: ({ user }) => !!user, // Requiere usuario autenticado
      handler: (ctx) => {
        ctx.actions.toUser(ctx.data.toUserId).emit("private-message", {
          from: ctx.user?.id,
          text: ctx.data.text,
        });
      },
    },

    // Evento con rate limiting
    "spam-prone-event": {
      rateLimit: {
        eventsPerSecond: 5,  // Máximo 5 eventos por segundo
        burst: 10,            // Permite hasta 10 eventos en ráfaga
      },
      handler: (ctx) => {
        // Tu lógica aquí
      },
    },
  },
});
```

### Contexto (`WssContext`)

El contexto proporciona acceso a:

```ts
interface WssContext {
  // Socket.IO
  socket: Socket;              // Socket.IO socket instance
  io: Server;                   // Socket.IO server instance
  
  // Request
  req: {
    headers: Record<string, string | string[] | undefined>;
    ip: string;
    url: string;
    cookies?: Record<string, string>;
  };
  
  // User (desde auth hook)
  user: TUser | null;
  
  // Data (payload del evento, validado si hay schema)
  data: any;
  
  // State Store (compartido entre instancias)
  state: RealtimeStateStore;
  
  // Logger
  log: Logger;
  
  // Actions (helpers para emitir mensajes)
  actions: {
    reply(event, payload): void;                    // Emitir a socket actual
    emit(event, payload): void;                    // Emitir a todos en namespace
    broadcast(event, payload, opts?): void;         // Emitir a todos excepto sender
    join(room: string): Promise<void>;              // Unirse a room
    leave(room: string): Promise<void>;            // Salir de room
    toRoom(room: string): { emit(event, payload) }; // Emitir a room específico
    toUser(userId: string): { emit(event, payload) }; // Emitir a usuario específico
    error(code, message, details?): void;          // Emitir error
  };
}
```

### State Store

El state store permite compartir estado entre instancias (útil en cluster):

```ts
// Guardar valor
await ctx.state.set("key", "value", { ttl: 3600 }); // TTL opcional en segundos

// Obtener valor
const value = await ctx.state.get("key");

// Incrementar/decrementar
await ctx.state.incr("counter");
await ctx.state.decr("counter");

// Listas
await ctx.state.listPush("messages", message, { maxLen: 100 });
const messages = await ctx.state.listRange("messages", 0, 20);

// Sets
await ctx.state.setAdd("online-users", userId);
const users = await ctx.state.setMembers("online-users");

// Eliminar
await ctx.state.del("key");
```

---

## Cliente WebSocket

### Uso Básico

```tsx
// app/realtime/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { lolySocket } from "@lolyjs/core/sockets";

export default function ChatPage() {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Conectar al namespace /chat
    const socketInstance = lolySocket("/chat");

    socketInstance.on("connect", () => {
      console.log("✅ Conectado");
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Desconectado");
      setConnected(false);
    });

    socketInstance.on("message", (data: any) => {
      setMessages((prev) => [...prev, data]);
    });

    socketInstance.on("__loly:error", (error: any) => {
      console.error("Error:", error);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (socket && connected) {
      socket.emit("message", { text });
    }
  };

  return (
    <div>
      <p>Estado: {connected ? "✅ Conectado" : "❌ Desconectado"}</p>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg.text}</div>
        ))}
      </div>
      <button onClick={() => sendMessage("Hola!")}>
        Enviar mensaje
      </button>
    </div>
  );
}
```

### Opciones de Conexión

```ts
// Con opciones personalizadas
const socket = lolySocket("/chat", {
  transports: ["websocket"], // Solo WebSocket, sin polling
  autoConnect: false,         // Conectar manualmente
  reconnection: true,         // Reintentar conexión
  reconnectionDelay: 1000,    // Delay entre reintentos
});

// Conectar manualmente
socket.connect();

// Desconectar
socket.disconnect();
```

**Nota:** Por defecto, `lolySocket` usa `window.location.origin` como base URL. No necesitas configurar `PUBLIC_WS_BASE_URL` a menos que el servidor WebSocket esté en un dominio diferente.

---

## Configuración Avanzada

### Opciones Completas de `realtime` en `loly.config.ts`

```ts
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    realtime: {
      // Habilitar/deshabilitar
      enabled: true,

      // Path del engine de Socket.IO
      path: "/wss",

      // Transports permitidos
      transports: ["websocket", "polling"],

      // Ping/pong intervalos (ms)
      pingIntervalMs: 25000,
      pingTimeoutMs: 20000,

      // Tamaño máximo de payload (bytes)
      maxPayloadBytes: 64 * 1024, // 64KB

      // CORS
      allowedOrigins: ["https://tu-dominio.com"], // o "*" para desarrollo
      cors: {
        credentials: true,
        allowedHeaders: ["content-type", "authorization"],
      },

      // Rate limiting global
      limits: {
        eventsPerSecond: 30,
        burst: 60,
      },

      // Escalado
      scale: {
        mode: "single", // "single" | "cluster"
        adapter: {
          // Solo necesario si mode === "cluster"
          url: "redis://localhost:6379",
        },
        stateStore: {
          name: "memory", // "memory" | "redis"
          url: "redis://localhost:6379", // Solo si name === "redis"
          prefix: "loly:rt:",
        },
      },

      // Logging
      logging: {
        level: "info", // "debug" | "info" | "warn" | "error"
      },
    },
  };
};
```

### Configuración Simplificada (Recomendada)

Para la mayoría de casos, no necesitas configurar nada:

```ts
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    // Realtime funciona con defaults
    // Solo configura si necesitas algo específico
  };
};
```

**Defaults:**
- `enabled: true`
- `path: "/wss"`
- `transports: ["websocket", "polling"]`
- `allowedOrigins: "*"` (auto-permite localhost en desarrollo)
- `scale.mode: "single"`
- `stateStore.name: "memory"`

---

## Multi-Instancia (Cluster)

Para escalar horizontalmente, configura Redis:

### 1. Instalar Dependencias

```bash
pnpm add @socket.io/redis-adapter ioredis
```

### 2. Configurar en `loly.config.ts`

```ts
// loly.config.ts
import { ServerConfig } from "@lolyjs/core";

export const config = (env: string): ServerConfig => {
  return {
    realtime: {
      scale: {
        mode: "cluster",
        adapter: {
          url: process.env.REDIS_URL || "redis://localhost:6379",
        },
        stateStore: {
          name: "redis",
          url: process.env.REDIS_URL || "redis://localhost:6379",
          prefix: "loly:rt:",
        },
      },
    },
  };
};
```

### 3. Iniciar Múltiples Instancias

```bash
# Terminal 1
PORT=3000 pnpm start

# Terminal 2
PORT=3001 pnpm start

# Terminal 3
PORT=3002 pnpm start
```

Con Redis configurado, todas las instancias comparten:
- **Rooms** - Los usuarios pueden unirse a rooms desde cualquier instancia
- **State Store** - Estado compartido entre instancias
- **Presence** - Mapeo usuario-socket funciona entre instancias
- **toUser()** - Funciona incluso si el usuario está en otra instancia

---

## Ejemplos Completos

### Ejemplo 1: Chat Simple

**Servidor:**
```ts
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  events: {
    message: {
      schema: z.object({
        text: z.string().min(1).max(500),
      }),
      handler: (ctx) => {
        ctx.actions.broadcast("message", {
          text: ctx.data.text,
          from: ctx.socket.id,
          timestamp: Date.now(),
        });
      },
    },
  },
});
```

**Cliente:**
```tsx
// app/chat/page.tsx
"use client";
import { useEffect, useState } from "react";
import { lolySocket } from "@lolyjs/core/sockets";

export default function Chat() {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const s = lolySocket("/chat");
    s.on("message", (data: any) => {
      setMessages((prev) => [...prev, data]);
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const send = () => {
    if (socket && input.trim()) {
      socket.emit("message", { text: input });
      setInput("");
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg.text}</div>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={send}>Enviar</button>
    </div>
  );
}
```

### Ejemplo 2: Chat con Autenticación y Rooms

**Servidor:**
```ts
// app/wss/chat/events.ts
import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

export default defineWssRoute({
  auth: async (ctx) => {
    const token = ctx.req.headers.authorization;
    if (!token) return null;
    return await verifyJWT(token);
  },

  events: {
    "join-room": {
      schema: z.object({ roomId: z.string() }),
      guard: ({ user }) => !!user,
      handler: async (ctx) => {
        await ctx.actions.join(ctx.data.roomId);
        ctx.actions.toRoom(ctx.data.roomId).emit("user-joined", {
          userId: ctx.user?.id,
        });
      },
    },

    "room-message": {
      schema: z.object({
        roomId: z.string(),
        text: z.string().min(1),
      }),
      guard: ({ user }) => !!user,
      handler: (ctx) => {
        ctx.actions.toRoom(ctx.data.roomId).emit("message", {
          text: ctx.data.text,
          from: ctx.user?.id,
        });
      },
    },
  },
});
```

### Ejemplo 3: Notificaciones en Tiempo Real

**Servidor:**
```ts
// app/wss/notifications/events.ts
import { defineWssRoute } from "@lolyjs/core";

export default defineWssRoute({
  auth: async (ctx) => {
    // Obtener usuario desde cookie/session
    const sessionId = ctx.req.cookies?.sessionId;
    return await getUserFromSession(sessionId);
  },

  onConnect: async (ctx) => {
    // Unirse a room personal del usuario
    if (ctx.user?.id) {
      await ctx.actions.join(`user:${ctx.user.id}`);
    }
  },

  events: {
    // Este evento puede ser llamado desde una API route
    // para enviar notificaciones
  },
});
```

**Enviar notificación desde API:**
```ts
// app/api/notify/route.ts
import { getWssServer } from "@lolyjs/core"; // Si está disponible

export async function POST(ctx: ApiContext) {
  const { userId, message } = ctx.req.body;
  
  // Enviar notificación al usuario
  // (Esto requeriría acceso al servidor Socket.IO)
  // Por ahora, usa el state store para que el namespace lo lea
  
  return ctx.Response({ sent: true });
}
```

---

## Troubleshooting

### "Invalid namespace" Error

**Problema:** El cliente no puede conectarse al namespace.

**Solución:**
1. Verifica que el archivo esté en `app/wss/[namespace]/events.ts`
2. Verifica que uses `lolySocket("/namespace")` (con `/` al inicio)
3. Revisa los logs del servidor para ver qué namespaces están registrados
4. Asegúrate de que el servidor esté corriendo

### "Not allowed by CORS" Error

**Problema:** El cliente no puede conectarse por CORS.

**Solución:**
1. En desarrollo, el framework auto-permite localhost
2. En producción, configura `realtime.allowedOrigins` en `loly.config.ts`:
   ```ts
   realtime: {
     allowedOrigins: ["https://tu-dominio.com"],
   }
   ```

### Conexión Funciona en Dev pero No en Producción

**Problema:** Funciona con `pnpm dev` pero no con `pnpm start`.

**Solución:**
1. Asegúrate de hacer `pnpm build` antes de `pnpm start`
2. Verifica que el manifest se haya generado correctamente
3. Revisa los logs del servidor para ver errores de carga de rutas

### Rate Limit Exceeded

**Problema:** Recibes errores de rate limit.

**Solución:**
1. Ajusta los límites en `loly.config.ts`:
   ```ts
   realtime: {
     limits: {
       eventsPerSecond: 50, // Aumentar
       burst: 100,
     },
   }
   ```
2. O ajusta el rate limit por evento:
   ```ts
   events: {
     "fast-event": {
       rateLimit: {
         eventsPerSecond: 100,
         burst: 200,
       },
       handler: (ctx) => { /* ... */ },
     },
   }
   ```

### State Store No Funciona en Cluster

**Problema:** El estado no se comparte entre instancias.

**Solución:**
1. Configura Redis para el state store:
   ```ts
   realtime: {
     scale: {
       mode: "cluster",
       stateStore: {
         name: "redis",
         url: "redis://localhost:6379",
       },
     },
   }
   ```
2. Asegúrate de que Redis esté corriendo

### `toUser()` No Funciona

**Problema:** Los mensajes no llegan al usuario objetivo.

**Solución:**
1. Verifica que el `auth` hook retorne un usuario con `id`
2. En cluster, asegúrate de configurar Redis para presence
3. Verifica que el usuario objetivo esté conectado

---

## Mejores Prácticas

1. **Siempre valida con schemas** - Usa Zod/Valibot para validar payloads
2. **Usa guards para autenticación** - No confíes solo en el auth hook
3. **Configura rate limits** - Especialmente para eventos públicos
4. **Usa state store para datos compartidos** - No uses variables globales
5. **Maneja errores** - Usa `ctx.actions.error()` para errores estructurados
6. **Logging** - Usa `ctx.log` para debugging y monitoreo
7. **Type safety** - Define tipos para `user` y `data` cuando sea posible

---

## Recursos Adicionales

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Zod Documentation](https://zod.dev/)
- [Redis Documentation](https://redis.io/docs/)
