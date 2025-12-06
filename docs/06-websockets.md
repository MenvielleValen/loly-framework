# WebSockets (WSS)

**Característica exclusiva de Loly Framework**: Soporte nativo y completo para WebSockets usando Socket.IO, integrado directamente en el sistema de routing. A diferencia de otros frameworks que requieren configuración manual o servicios externos, Loly permite definir WebSocket namespaces y eventos usando el mismo patrón de archivos que las páginas y APIs.

Permite comunicación en tiempo real bidireccional entre cliente y servidor con una API simple y declarativa.

## Conceptos Básicos

### Namespaces con Routing Automático
**Ventaja única de Loly**: Los WebSockets se organizan en namespaces que se crean automáticamente basándose en la estructura de archivos, igual que las rutas de páginas y APIs:

```
app/wss/chat/events.ts        → Namespace: /chat (automático)
app/wss/notifications/events.ts → Namespace: /notifications (automático)
app/wss/game/[roomId]/events.ts → Namespace: /game/:roomId (con parámetros dinámicos)
```

No necesitas configurar manualmente los namespaces - el framework los crea automáticamente basándose en la estructura de carpetas.

### Event Handlers
Los eventos se definen en un array de handlers:

```tsx
// app/wss/chat/events.ts
import type { WssContext } from "@lolyjs/core";

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected:", ctx.socket.id);
    },
  },
  {
    name: "message",
    handler: (ctx: WssContext) => {
      const { data, actions } = ctx;
      actions.emit("message", { text: data.text });
    },
  },
];
```

## WssContext

El contexto de WebSocket proporciona:

```typescript
interface WssContext {
  socket: Socket;                    // Socket.IO socket instance
  io: Server;                        // Socket.IO server instance
  params: Record<string, string>;    // Parámetros de ruta
  pathname: string;                  // Path del namespace
  data?: any;                        // Datos del evento
  actions: WssActions;               // Helpers para emitir eventos
}
```

### WssActions

```typescript
interface WssActions {
  // Emitir a todos los clientes en el namespace
  emit: (event: string, ...args: any[]) => void;
  
  // Emitir a un socket específico por socketId
  emitTo: (socketId: string, event: string, ...args: any[]) => void;
  
  // Emitir a un cliente específico por clientId (requiere almacenar clientId en socket.data)
  emitToClient: (clientId: string, event: string, ...args: any[]) => void;
  
  // Broadcast a todos excepto el emisor
  broadcast: (event: string, ...args: any[]) => void;
}
```

## Event Handlers

### Connection Handler
Se ejecuta cuando un cliente se conecta:

```tsx
export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("New connection:", ctx.socket.id);
      
      // Manejar desconexión
      ctx.socket.on("disconnect", () => {
        console.log("Client disconnected:", ctx.socket.id);
      });
    },
  },
];
```

### Custom Events
Eventos personalizados definidos por tu aplicación:

```tsx
export const events = [
  {
    name: "chat",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      
      // Validar datos
      if (!data.text || !data.fromClientId) {
        socket.emit("error", { message: "Invalid data" });
        return;
      }
      
      // Broadcast a todos los clientes
      actions.broadcast("chat", {
        text: data.text,
        fromClientId: data.fromClientId,
        at: Date.now(),
      });
    },
  },
];
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
    // Conectar al namespace /chat
    const socketInstance = lolySocket("/chat");
    setSocket(socketInstance);

    // Escuchar eventos
    socketInstance.on("chat", (data) => {
      setMessages(prev => [...prev, data]);
    });

    socketInstance.on("connect", () => {
      console.log("Connected");
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected");
    });

    return () => {
      socketInstance.close();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (socket && socket.connected) {
      socket.emit("chat", { text, fromClientId: "client-123" });
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

### lolySocket Helper

El helper `lolySocket` simplifica la conexión:

```tsx
import { lolySocket } from "@lolyjs/core/sockets";

// Conecta automáticamente
const socket = lolySocket("/chat");

// Con opciones personalizadas
const socket = lolySocket("/chat", {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
});
```

**Configuración:**
- `path`: `/wss` (ruta donde Socket.IO escucha)
- `transports`: `["websocket", "polling"]` (por defecto)
- `baseUrl`: Se obtiene de `PUBLIC_WS_BASE_URL` o `window.location.origin`

## Ejemplos Completos

### Chat Simple

**Servidor:**
```tsx
// app/wss/chat/events.ts
import type { WssContext } from "@lolyjs/core";

type ChatMessage = {
  text: string;
  fromClientId: string;
  at: number;
};

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected:", ctx.socket.id);
      
      ctx.socket.on("disconnect", () => {
        console.log("Client disconnected:", ctx.socket.id);
      });
    },
  },
  {
    name: "chat",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      
      if (!data.text || !data.fromClientId) {
        socket.emit("error", { message: "Invalid data" });
        return;
      }
      
      const message: ChatMessage = {
        text: data.text,
        fromClientId: data.fromClientId,
        at: data.at ?? Date.now(),
      };
      
      // Broadcast a todos los clientes
      actions.broadcast("chat", message);
    },
  },
];
```

**Cliente:**
```tsx
// components/Chat.tsx
import { lolySocket } from "@lolyjs/core/sockets";
import { useEffect, useState, useRef } from "react";

export default function Chat() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [clientId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const socketInstance = lolySocket("/chat");
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected");
    });

    socketInstance.on("chat", (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => socketInstance.close();
  }, []);

  const sendMessage = () => {
    if (!socket || !socket.connected || !input.trim()) return;
    
    socket.emit("chat", {
      text: input,
      fromClientId: clientId,
      at: Date.now(),
    });
    
    setInput("");
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.fromClientId}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Chat con Usuarios Registrados

**Servidor:**
```tsx
// app/wss/chat/events.ts
const connectedUsers = new Map<string, { clientId: string; name: string }>();
const clientIdToSocketId = new Map<string, string>();

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      ctx.socket.on("disconnect", () => {
        const user = connectedUsers.get(ctx.socket.id);
        if (user) {
          connectedUsers.delete(ctx.socket.id);
          clientIdToSocketId.delete(user.clientId);
          ctx.actions.broadcast("user-left", { clientId: user.clientId });
        }
      });
    },
  },
  {
    name: "register",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const { clientId, name } = data;

      if (!clientId || !name) {
        socket.emit("error", { message: "clientId and name required" });
        return;
      }

      // Almacenar usuario
      connectedUsers.set(socket.id, { clientId, name });
      clientIdToSocketId.set(clientId, socket.id);
      (socket as any).data = { clientId, name };

      // Notificar registro exitoso
      socket.emit("registered", { clientId, name });

      // Notificar a otros usuarios
      actions.broadcast("user-joined", { clientId, name });
    },
  },
  {
    name: "chat",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", { message: "Not registered" });
        return;
      }

      actions.emit("chat", {
        text: data.text,
        fromClientId: user.clientId,
        fromName: user.name,
        at: Date.now(),
      });
    },
  },
  {
    name: "private-message",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const { toClientId, text } = data;
      const sender = connectedUsers.get(socket.id);

      if (!sender) return;

      const message = {
        text,
        fromClientId: sender.clientId,
        fromName: sender.name,
        toClientId,
        at: Date.now(),
      };

      // Enviar al destinatario si está conectado
      const recipientSocketId = clientIdToSocketId.get(toClientId);
      if (recipientSocketId) {
        actions.emitTo(recipientSocketId, "private-message", message);
      }

      // Confirmar al emisor
      socket.emit("private-message-sent", message);
    },
  },
];
```

## Mejores Prácticas

1. **Validación**: Valida datos en los handlers
2. **Manejo de Errores**: Emite errores al cliente cuando sea necesario
3. **Gestión de Estado**: Almacena estado de conexiones (usuarios, salas, etc.)
4. **Cleanup**: Limpia recursos en disconnect
5. **Type Safety**: Tipa tus eventos y datos

## Configuración

### Variable de Entorno

```env
PUBLIC_WS_BASE_URL=http://localhost:3000
```

Si no se define, se usa `window.location.origin` en el cliente.

## Próximos Pasos

- [API Routes](./05-api-routes.md) - Endpoints REST
- [Components](./14-components.md) - Componentes React del framework
