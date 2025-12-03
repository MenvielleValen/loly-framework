import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { WssRoute, WssContext } from "@router/index.types";

export interface SetupWssEventsOptions {
  httpServer: HttpServer;
  wssRoutes: WssRoute[];
}

/**
 * Generates helper actions for WebSocket context.
 * 
 * Wraps Socket.IO methods in arrow functions to preserve the correct context
 * when used later in event handlers.
 * 
 * @param socket - The Socket.IO socket instance
 * @param namespace - The Socket.IO namespace instance
 * @returns Actions object with helper methods for the namespace
 */
const generateActions = (socket: Socket, namespace: any): WssContext['actions'] => {
  return {
    // Emit to all clients in the namespace
    emit: (event: string, ...args: any[]) => {
      socket.nsp.emit(event, ...args);
    },
    
    // Emit to a specific socket by Socket.IO socket ID
    emitTo: (socketId: string, event: string, ...args: any[]) => {
      const targetSocket = namespace.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.emit(event, ...args);
      }
    },
    
    // Emit to a specific client by custom clientId
    // Requires clientId to be stored in socket.data.clientId during connection
    emitToClient: (clientId: string, event: string, ...args: any[]) => {
      // Find socket by clientId stored in socket.data
      namespace.sockets.forEach((s: Socket) => {
        if (s.data?.clientId === clientId) {
          s.emit(event, ...args);
        }
      });
    },
    
    // Broadcast to all clients except the sender
    broadcast: (event: string, ...args: any[]) => {
      socket.broadcast.emit(event, ...args);
    },
  };
};

/**
 * Sets up Socket.IO server and registers WebSocket event handlers for each route.
 * 
 * This function:
 * - Creates a Socket.IO server instance with the '/wss' path
 * - Extracts namespaces from route patterns (removes '/wss' prefix)
 * - Registers connection handlers for each namespace
 * - Maps event handlers from route definitions to Socket.IO events
 * 
 * @param options - WebSocket setup options
 * 
 * @example
 * ```ts
 * setupWssEvents({
 *   httpServer,
 *   wssRoutes: [{ pattern: '/wss/chat', handlers: { ... } }]
 * });
 * ```
 */
export function setupWssEvents(options: SetupWssEventsOptions): void {
  const { httpServer, wssRoutes } = options;

  if (wssRoutes.length === 0) {
    return;
  }

  const io = new Server(httpServer, {
    path: '/wss'
  });

  for (const wssRoute of wssRoutes) {
    // Extract namespace from route pattern by removing the '/wss' prefix
    // Example: Pattern '/wss/chat' -> Namespace '/chat'
    // Example: Pattern '/wss' -> Namespace '/'
    let namespacePath = wssRoute.pattern.replace(/^\/wss/, '');
    
    // Ensure namespace always starts with '/'
    if (!namespacePath.startsWith('/')) {
      namespacePath = '/' + namespacePath;
    }
    
    // If empty after removal, use root namespace
    if (namespacePath === '') {
      namespacePath = '/';
    }
    
    const namespace = io.of(namespacePath);

    // Set up connection handler for this namespace
    namespace.on('connection', (socket: Socket) => {
      // Register all event handlers defined in the route
      Object.entries(wssRoute.handlers).forEach(([event, handler]) => {
        if (event.toLowerCase() === 'connection') {
          // Connection handler is executed immediately upon connection
          const ctx: WssContext = {
            socket,
            io: namespace.server,
            params: {},
            pathname: wssRoute.pattern,
            actions: generateActions(socket, namespace),
          };
          handler(ctx as any);
        } else {
          // For other events, register them on the socket instance
          socket.on(event, (data) => {
            const ctx: WssContext = {
              socket,
              io: namespace.server,
              actions: generateActions(socket, namespace),
              params: {},
              pathname: wssRoute.pattern,
              data,
            };
            handler(ctx as any);
          });
        }
      });
    });
  }
}
