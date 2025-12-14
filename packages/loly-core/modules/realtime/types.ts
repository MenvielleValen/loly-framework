import type { Server, Socket } from "socket.io";

/**
 * Authentication context provided to the auth hook.
 * Contains request metadata needed for authentication.
 */
export interface AuthContext {
  /** Request headers */
  req: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    url?: string;
    cookies?: Record<string, string>;
  };
  /** Socket.IO socket instance */
  socket: Socket;
  /** Namespace path (e.g., "/chat") */
  namespace: string;
}

/**
 * Rate limit configuration for events.
 */
export interface RateLimitCfg {
  /** Maximum events per second */
  eventsPerSecond: number;
  /** Burst capacity (optional, defaults to eventsPerSecond * 2) */
  burst?: number;
}

/**
 * Guard function type. Returns true to allow, false to block.
 */
export type GuardFn<TUser = any> = (ctx: {
  user: TUser | null;
  req: AuthContext["req"];
  socket: Socket;
  namespace: string;
}) => boolean | Promise<boolean>;

/**
 * Authentication function type.
 * Returns the authenticated user or null.
 */
export type AuthFn<TUser = any> = (
  ctx: AuthContext
) => TUser | null | Promise<TUser | null>;

/**
 * Schema validation adapter.
 * Must support Zod-like interface: schema.parse(data) or schema.safeParse(data)
 */
export type Schema = {
  parse?: (data: any) => any;
  safeParse?: (data: any) => { success: boolean; error?: any; data?: any };
} & Record<string, any>;

/**
 * Realtime state store interface.
 * Provides key-value storage, lists, sets, and atomic operations.
 */
export interface RealtimeStateStore {
  /** Get a value by key */
  get<T = any>(key: string): Promise<T | null>;

  /** Set a value with optional TTL */
  set<T = any>(
    key: string,
    value: T,
    opts?: { ttlMs?: number }
  ): Promise<void>;

  /** Delete a key */
  del(key: string): Promise<void>;

  /** Increment a numeric value */
  incr(key: string, by?: number): Promise<number>;

  /** Decrement a numeric value */
  decr(key: string, by?: number): Promise<number>;

  /** Push to a list (left push) */
  listPush(key: string, value: any, opts?: { maxLen?: number }): Promise<void>;

  /** Get range from a list */
  listRange<T = any>(key: string, start: number, end: number): Promise<T[]>;

  /** Add member to a set */
  setAdd(key: string, member: string): Promise<void>;

  /** Remove member from a set */
  setRem(key: string, member: string): Promise<void>;

  /** Get all members of a set */
  setMembers(key: string): Promise<string[]>;

  /** Optional: Acquire a distributed lock (returns unlock function) */
  lock?(
    key: string,
    ttlMs: number
  ): Promise<() => Promise<void>>;
}

/**
 * Logger interface for realtime events.
 */
export interface RealtimeLogger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Metrics interface (optional for v1).
 */
export interface RealtimeMetrics {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordLatency(name: string, ms: number, labels?: Record<string, string>): void;
}

/**
 * Extended WssActions with full RFC support.
 */
export interface WssActions {
  /**
   * Emit to current socket only (reply)
   */
  reply(event: string, payload?: any): void;

  /**
   * Emit to all sockets in current namespace
   */
  emit(event: string, payload?: any): void;

  /**
   * Emit to everyone except current socket
   */
  broadcast(
    event: string,
    payload?: any,
    opts?: { excludeSelf?: boolean }
  ): void;

  /**
   * Join a room
   */
  join(room: string): Promise<void>;

  /**
   * Leave a room
   */
  leave(room: string): Promise<void>;

  /**
   * Emit to a specific room
   */
  toRoom(room: string): {
    emit(event: string, payload?: any): void;
  };

  /**
   * Emit to a specific user (by userId)
   * Uses presence mapping to find user's sockets
   */
  toUser(userId: string): {
    emit(event: string, payload?: any): void;
  };

  /**
   * Emit error event (reserved event: __loly:error)
   */
  error(code: string, message: string, details?: any): void;

  /**
   * Legacy: Emit to a specific socket by Socket.IO socket ID
   * @deprecated Use toUser() for user targeting
   */
  emitTo?: (socketId: string, event: string, ...args: any[]) => void;

  /**
   * Legacy: Emit to a specific client by custom clientId
   * @deprecated Use toUser() for user targeting
   */
  emitToClient?: (clientId: string, event: string, ...args: any[]) => void;
}

/**
 * Extended WssContext with full RFC support.
 */
export interface WssContext<TData = any, TUser = any> {
  /** Socket.IO server instance */
  io: Server;

  /** Socket.IO socket instance */
  socket: Socket;

  /** Request metadata */
  req: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    url?: string;
    cookies?: Record<string, string>;
  };

  /** Authenticated user (set by auth hook) */
  user: TUser | null;

  /** Incoming payload for current event */
  data: TData;

  /** Route params (from dynamic routes) */
  params: Record<string, string>;

  /** Route pathname */
  pathname: string;

  /** Framework utilities */
  actions: WssActions;

  /** State store for shared state */
  state: RealtimeStateStore;

  /** Logger with WSS context */
  log: RealtimeLogger;

  /** Metrics (optional) */
  metrics?: RealtimeMetrics;
}

/**
 * WSS event handler type.
 */
export type WssHandler<TData = any, TUser = any> = (
  ctx: WssContext<TData, TUser>
) => void | Promise<void>;

/**
 * WSS event definition.
 * Can be a simple handler or an object with validation, guards, and rate limiting.
 */
export type WssEventDefinition<TData = any, TUser = any> =
  | WssHandler<TData, TUser>
  | {
      /** Schema for validation (Zod/Valibot compatible) */
      schema?: Schema;
      /** Per-event rate limit config */
      rateLimit?: RateLimitCfg;
      /** Guard function (auth/roles/permissions) */
      guard?: GuardFn<TUser>;
      /** Event handler */
      handler: WssHandler<TData, TUser>;
    };

/**
 * WSS route definition (result of defineWssRoute).
 */
export interface WssRouteDefinition<TUser = any> {
  /** Namespace (optional, inferred from folder name) */
  namespace?: string;

  /** Authentication hook */
  auth?: AuthFn<TUser>;

  /** Connection hook */
  onConnect?: WssHandler<any, TUser>;

  /** Disconnection hook */
  onDisconnect?: (
    ctx: WssContext<any, TUser>,
    reason?: string
  ) => void | Promise<void>;

  /** Event handlers */
  events: Record<string, WssEventDefinition<any, TUser>>;
}
