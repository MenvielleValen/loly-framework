import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

/**
 * Creates a Socket.IO client connection to a specific namespace.
 * 
 * This helper function simplifies Socket.IO client setup by handling:
 * - Namespace normalization (ensures leading slash)
 * - Base URL resolution (from environment or current origin)
 * - Default Socket.IO configuration (path: '/wss', transports: ['websocket', 'polling'])
 * 
 * @param namespace - The namespace to connect to (e.g., '/chat' or 'chat').
 *                    The namespace will be normalized to always start with '/'.
 *                    Must match the namespace pattern defined in your server's WSS routes.
 * @param opts - Optional Socket.IO client options that will override the defaults.
 * 
 * @returns A Socket.IO client instance connected to the specified namespace.
 * 
 * @example
 * ```ts
 * const socket = lolySocket('/chat');
 * socket.on('message', (data) => {
 *   console.log('Received:', data);
 * });
 * socket.emit('message', { text: 'Hello' });
 * ```
 */
export const lolySocket = (
  namespace: string,
  opts?: Partial<ManagerOptions & SocketOptions>
): Socket => {
  // @ts-ignore - process.env.PUBLIC_WS_BASE_URL is replaced by DefinePlugin at build time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsBaseUrl: string | undefined = (process as any).env?.PUBLIC_WS_BASE_URL;
  
  let baseUrl: string;
  if (wsBaseUrl && wsBaseUrl.trim() !== "") {
    baseUrl = wsBaseUrl;
  } else if (typeof window !== "undefined") {
    baseUrl = window.location.origin;
  } else {
    throw new Error(
      "[loly:socket] Cannot determine base URL in server-side context. " +
      "Either set PUBLIC_WS_BASE_URL in your .env file or ensure lolySocket is only called on the client."
    );
  }

  const normalizedNamespace = namespace.startsWith("/") ? namespace : `/${namespace}`;
  const fullUrl = `${baseUrl}${normalizedNamespace}`;

  const socket = io(fullUrl, {
    path: "/wss",
    transports: ["websocket", "polling"],
    autoConnect: true,
    ...opts,
  });

  return socket;
};
