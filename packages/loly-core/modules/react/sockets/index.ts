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
  const baseUrl = process.env.PUBLIC_WS_BASE_URL || window.location.origin;

  // Normalize namespace to always start with '/'
  const normalizedNamespace = namespace.startsWith("/") ? namespace : `/${namespace}`;

  // In Socket.IO, when using a custom path, the namespace is specified in the URL:
  // baseUrl + namespace. The path '/wss' is the HTTP route where Socket.IO listens.
  const fullUrl = `${baseUrl}${normalizedNamespace}`;

  const socket = io(fullUrl, {
    path: "/wss",
    transports: ["websocket", "polling"],
    autoConnect: true,
    ...opts,
  });

  return socket;
};
