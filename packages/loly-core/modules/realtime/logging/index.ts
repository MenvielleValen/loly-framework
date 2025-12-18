import type { RealtimeLogger } from "../types";
import type { Socket } from "socket.io";

/**
 * Log levels hierarchy
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Creates a logger with WSS context.
 */
export function createWssLogger(
  namespace: string,
  socket: Socket,
  baseLogger?: any,
  minLevel: LogLevel = "info"
): RealtimeLogger {
  const context = {
    namespace,
    socketId: socket.id,
    userId: (socket as any).data?.user?.id || null,
  };

  const minLevelNum = LOG_LEVELS[minLevel] ?? LOG_LEVELS.info;

  const log = (level: string, message: string, meta?: Record<string, any>) => {
    const levelNum = LOG_LEVELS[level as LogLevel] ?? LOG_LEVELS.info;
    
    // Skip if level is below minimum
    if (levelNum < minLevelNum) {
      return;
    }

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
