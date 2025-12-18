import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import type { ExtendedWssRoute } from "@router/loader-wss";
import type { WssContext } from "@realtime/types";
import { getServerConfig } from "./config";
import { createStateStore } from "@realtime/state";
import { PresenceManager } from "@realtime/presence";
import { RateLimiter } from "@realtime/rate-limit";
import { executeAuth } from "@realtime/auth";
import { executeGuard } from "@realtime/guards";
import { validateSchema } from "@realtime/validation";
import { createWssLogger } from "@realtime/logging";
import { generateRequestId } from "@logger/index";
import type { PresenceManager as PresenceManagerType } from "@realtime/presence";

export interface SetupWssEventsOptions {
  httpServer: HttpServer;
  wssRoutes: ExtendedWssRoute[];
  projectRoot: string;
}

/**
 * Generates helper actions for WebSocket context.
 * 
 * Wraps Socket.IO methods in arrow functions to preserve the correct context
 * when used later in event handlers.
 * 
 * @param socket - The Socket.IO socket instance
 * @param namespace - The Socket.IO namespace instance
 * @param presence - Optional presence manager for user targeting
 * @returns Actions object with helper methods for the namespace
 */
const generateActions = (
  socket: Socket,
  namespace: any,
  presence?: PresenceManagerType
): WssContext['actions'] => {
  return {
    // Emit to current socket only (reply)
    reply: (event: string, payload?: any) => {
      socket.emit(event, payload);
    },

    // Emit to all clients in the namespace
    emit: (event: string, payload?: any) => {
      socket.nsp.emit(event, payload);
    },
    
    // Emit to everyone except current socket
    broadcast: (
      event: string,
      payload?: any,
      opts?: { excludeSelf?: boolean }
    ) => {
      if (opts?.excludeSelf === false) {
        // Include self - emit to namespace
        socket.nsp.emit(event, payload);
      } else {
        // Exclude self - use broadcast
        socket.broadcast.emit(event, payload);
      }
    },

    // Join a room
    join: async (room: string) => {
      await socket.join(room);
    },

    // Leave a room
    leave: async (room: string) => {
      await socket.leave(room);
    },

    // Emit to a specific room
    toRoom: (room: string) => {
      return {
        emit: (event: string, payload?: any) => {
          namespace.to(room).emit(event, payload);
        },
      };
    },

    // Emit to a specific user (by userId)
    toUser: (userId: string) => {
      return {
        emit: async (event: string, payload?: any) => {
          if (!presence) {
            return;
          }

          const socketIds = await presence.getSocketsForUser(userId);
          for (const socketId of socketIds) {
            const targetSocket = namespace.sockets.get(socketId);
            if (targetSocket) {
              targetSocket.emit(event, payload);
            }
          }
        },
      };
    },

    // Emit error event (reserved event: __loly:error)
    error: (code: string, message: string, details?: any) => {
      socket.emit("__loly:error", {
        code,
        message,
        details,
        requestId: (socket as any).requestId || undefined,
      });
    },
    
    // Legacy: Emit to a specific socket by Socket.IO socket ID
    emitTo: (socketId: string, event: string, ...args: any[]) => {
      const targetSocket = namespace.sockets.get(socketId);
      if (targetSocket) {
        targetSocket.emit(event, ...args);
      }
    },
    
    // Legacy: Emit to a specific client by custom clientId
    emitToClient: (clientId: string, event: string, ...args: any[]) => {
      namespace.sockets.forEach((s: Socket) => {
        if (s.data?.clientId === clientId) {
          s.emit(event, ...args);
        }
      });
    },
  };
};

/**
 * Sets up Socket.IO server and registers WebSocket event handlers for each route.
 * 
 * This is the new, production-ready implementation that includes:
 * - Configuration from loly.config.ts
 * - State store (memory or Redis)
 * - Presence management
 * - Authentication hooks
 * - Schema validation
 * - Guards
 * - Rate limiting
 * - Logging
 * 
 * @param options - WebSocket setup options
 */
export async function setupWssEvents(options: SetupWssEventsOptions): Promise<void> {
  const { httpServer, wssRoutes, projectRoot } = options;

  if (wssRoutes.length === 0) {
    return;
  }

  // Get server configuration
  const serverConfig = await getServerConfig(projectRoot);
  const realtimeConfig = serverConfig.realtime;

  // Skip if realtime is disabled
  if (!realtimeConfig || !realtimeConfig.enabled) {
    return;
  }

  // Initialize state store
  const stateStore = await createStateStore(realtimeConfig);
  const stateStorePrefix = realtimeConfig.scale?.stateStore?.prefix || "loly:rt:";

  // Initialize presence manager
  const presence = new PresenceManager(stateStore, stateStorePrefix);

  // Initialize rate limiter
  const rateLimiter = new RateLimiter(
    realtimeConfig.scale?.mode === "cluster" ? stateStore : undefined,
    `${stateStorePrefix}rate:`
  );

  // Configure CORS - auto-allow localhost if no config (for simplicity)
  const allowedOrigins = realtimeConfig.allowedOrigins;
  
  // Auto-allow localhost if no config or empty array (for local development)
  const corsOrigin: any = 
    !allowedOrigins || 
    (Array.isArray(allowedOrigins) && allowedOrigins.length === 0) ||
    allowedOrigins === "*"
      ? // Auto-allow localhost on any port for simplicity
        (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          // Allow localhost on any port
          if (origin.startsWith("http://localhost:") || 
              origin.startsWith("http://127.0.0.1:") ||
              origin.startsWith("https://localhost:") ||
              origin.startsWith("https://127.0.0.1:")) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        }
      : allowedOrigins; // Use configured origins
  
  const corsOptions: any = {
    origin: corsOrigin,
    credentials: realtimeConfig.cors?.credentials ?? true,
    methods: ["GET", "POST"],
    allowedHeaders: realtimeConfig.cors?.allowedHeaders || [
      "content-type",
      "authorization",
    ],
  };

  // Create Socket.IO server
  const io = new Server(httpServer, {
    path: realtimeConfig.path || "/wss",
    transports: realtimeConfig.transports || ["websocket", "polling"],
    pingInterval: realtimeConfig.pingIntervalMs || 25000,
    pingTimeout: realtimeConfig.pingTimeoutMs || 20000,
    maxHttpBufferSize: realtimeConfig.maxPayloadBytes || 64 * 1024,
    cors: corsOptions,
  });

  // Setup Redis adapter if cluster mode
  if (realtimeConfig.scale?.mode === "cluster" && realtimeConfig.scale.adapter) {
    try {
      // Dynamic import for optional dependencies
      // @ts-ignore - Optional dependencies may not be installed
      const redisAdapterModule = await import("@socket.io/redis-adapter").catch(() => null);
      // @ts-ignore - Optional dependencies may not be installed
      const ioredisModule = await import("ioredis").catch(() => null);
      
      if (!redisAdapterModule || !ioredisModule) {
        throw new Error(
          "[loly:realtime] Redis adapter dependencies not found. " +
          "Install @socket.io/redis-adapter and ioredis for cluster mode: " +
          "pnpm add @socket.io/redis-adapter ioredis"
        );
      }
      
      const { createAdapter } = redisAdapterModule;
      const Redis = ioredisModule.default || ioredisModule;
      
      const pubClient = new Redis(realtimeConfig.scale.adapter.url);
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
    } catch (error) {
      throw error;
    }
  }

  // Process each route
  for (const wssRoute of wssRoutes) {
    // Use normalized route if available, otherwise fall back to legacy format
    const normalized = (wssRoute as any).normalized;
    
    if (!normalized) {
      // Legacy format - skip for now (should not happen with new loader)
      continue;
    }

    // Extract namespace (use from normalized or infer from pattern)
    let namespacePath = normalized.namespace || wssRoute.pattern.replace(/^\/wss/, '');
    
    if (!namespacePath.startsWith('/')) {
      namespacePath = '/' + namespacePath;
    }
    
    if (namespacePath === '') {
      namespacePath = '/';
    }

    const namespace = io.of(namespacePath);

    // Set up connection handler for this namespace
    namespace.on('connection', async (socket: Socket) => {
      // Generate request ID for this connection
      const requestId = generateRequestId();
      (socket as any).requestId = requestId;

      // Create logger for this socket
      const log = createWssLogger(namespacePath, socket);

      try {
        // Execute auth hook
        const user = await executeAuth(normalized.auth, socket, namespacePath);
        
        // Store user on socket
        (socket as any).data = (socket as any).data || {};
        (socket as any).data.user = user;

        // Add to presence if user exists
        if (user && user.id) {
          await presence.addSocketForUser(String(user.id), socket.id);
        }

        // Build base context
        const baseCtx: Partial<WssContext> = {
          req: {
            headers: socket.handshake.headers as Record<string, string | string[] | undefined>,
            ip: socket.handshake.address,
            url: socket.handshake.url,
            cookies: socket.handshake.headers.cookie
              ? parseCookies(socket.handshake.headers.cookie)
              : undefined,
          },
          user: user || null,
          params: {},
          pathname: wssRoute.pattern,
          actions: generateActions(socket, namespace, presence),
          state: stateStore,
          log,
        };

        // Execute onConnect hook
        if (normalized.onConnect) {
          try {
            await normalized.onConnect(baseCtx as WssContext);
          } catch (error) {
            log.error("Error in onConnect hook", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Register event handlers
        for (const [eventName, eventDef] of normalized.events.entries()) {
          socket.on(eventName, async (data: any) => {
            const eventRequestId = generateRequestId();
            (socket as any).requestId = eventRequestId;

            const eventLog = createWssLogger(namespacePath, socket);
            eventLog.debug(`Event received: ${eventName}`, { data });

            try {
              // Build context for this event
              const ctx: WssContext = {
                ...baseCtx,
                data,
                log: eventLog,
              } as WssContext;

              // Schema validation
              if (eventDef.schema) {
                const validation = validateSchema(eventDef.schema, data);
                if (!validation.success) {
                  ctx.actions.error("BAD_PAYLOAD", "Invalid payload", {
                    error: validation.error,
                  });
                  eventLog.warn("Schema validation failed", {
                    error: validation.error,
                  });
                  return;
                }
                // Use validated data
                ctx.data = validation.data;
              }

              // Guard check
              if (eventDef.guard) {
                const allowed = await executeGuard(eventDef.guard, ctx);
                if (!allowed) {
                  ctx.actions.error("FORBIDDEN", "Access denied");
                  eventLog.warn("Guard check failed");
                  return;
                }
              }

              // Rate limiting (global)
              const globalLimit = realtimeConfig.limits;
              if (globalLimit) {
                const globalAllowed = await rateLimiter.checkLimit(
                  socket.id,
                  {
                    eventsPerSecond: globalLimit.eventsPerSecond || 30,
                    burst: globalLimit.burst || 60,
                  }
                );
                if (!globalAllowed) {
                  ctx.actions.error("RATE_LIMIT", "Rate limit exceeded");
                  eventLog.warn("Global rate limit exceeded");
                  return;
                }
              }

              // Rate limiting (per-event)
              if (eventDef.rateLimit) {
                const eventAllowed = await rateLimiter.checkLimit(
                  `${socket.id}:${eventName}`,
                  eventDef.rateLimit
                );
                if (!eventAllowed) {
                  ctx.actions.error("RATE_LIMIT", "Event rate limit exceeded");
                  eventLog.warn("Event rate limit exceeded");
                  return;
                }
              }

              // Execute handler
              await eventDef.handler(ctx);
              eventLog.debug(`Event handled: ${eventName}`);
            } catch (error) {
              const errorLog = createWssLogger(namespacePath, socket);
              errorLog.error(`Error handling event ${eventName}`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              });

              // Emit error to client
              socket.emit("__loly:error", {
                code: "INTERNAL_ERROR",
                message: "An error occurred while processing your request",
                requestId: eventRequestId,
              });
            }
          });
        }

        // Handle disconnect
        socket.on('disconnect', async (reason?: string) => {
          const userId = (socket as any).data?.user?.id;
          
          // Remove from presence
          if (userId) {
            await presence.removeSocketForUser(String(userId), socket.id);
          }

          // Execute onDisconnect hook
          if (normalized.onDisconnect) {
            try {
              const disconnectCtx: WssContext = {
                ...baseCtx,
                log: createWssLogger(namespacePath, socket),
              } as WssContext;
              await normalized.onDisconnect(disconnectCtx, reason);
            } catch (error) {
              log.error("Error in onDisconnect hook", {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          log.info("Socket disconnected", { reason });
        });
      } catch (error) {
        log.error("Error during connection setup", {
          error: error instanceof Error ? error.message : String(error),
        });
        socket.disconnect();
      }
    });
  }
}

/**
 * Parse cookie string into object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieString.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}
