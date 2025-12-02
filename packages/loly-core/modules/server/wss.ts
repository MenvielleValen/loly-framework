import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { WssRoute, WssContext } from "@router/index.types";

export interface SetupWssEventsOptions {
  httpServer: HttpServer;
  wssRoutes: WssRoute[];
}

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
          // @TODO: Add helper functions in handler for example emit namespace event etc.
          const ctx: WssContext = {
            socket,
            io: namespace.server,
            params: {},
            pathname: wssRoute.pattern,
          };
          handler(ctx as any);
        } else {
          // For other events, register them on the socket instance
          // @TODO: Add helper functions in handler for example emit namespace event etc.
          socket.on(event, (data) => {
            const ctx: WssContext = {
              socket,
              io: namespace.server,
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
