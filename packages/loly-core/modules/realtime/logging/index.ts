import type { RealtimeLogger } from "../types";
import type { Socket } from "socket.io";

/**
 * Creates a logger with WSS context.
 */
export function createWssLogger(
  namespace: string,
  socket: Socket,
  baseLogger?: any
): RealtimeLogger {
  const context = {
    namespace,
    socketId: socket.id,
    userId: (socket as any).data?.user?.id || null,
  };

  const log = (level: string, message: string, meta?: Record<string, any>) => {
    const fullMeta = {
      ...context,
      ...meta,
      requestId: (socket as any).requestId || generateRequestId(),
    };

    if (baseLogger) {
      baseLogger[level](message, fullMeta);
    } else {
      console[level === "error" ? "error" : "log"](
        `[${level.toUpperCase()}] [${namespace}] ${message}`,
        fullMeta
      );
    }
  };

  return {
    debug: (message: string, meta?: Record<string, any>) => log("debug", message, meta),
    info: (message: string, meta?: Record<string, any>) => log("info", message, meta),
    warn: (message: string, meta?: Record<string, any>) => log("warn", message, meta),
    error: (message: string, meta?: Record<string, any>) => log("error", message, meta),
  };
}

/**
 * Generate a simple request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
