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
  // Simplified: Always use the current origin in the browser
  // Socket.IO handles the namespace automatically
  if (typeof window === "undefined") {
    throw new Error(
      "[loly:socket] lolySocket can only be called on the client side."
    );
  }

  const normalizedNamespace = namespace.startsWith("/") ? namespace : `/${namespace}`;
  
  // Socket.IO: io(namespace, { path: '/wss' })
  // Socket.IO uses window.location.origin automatically
  // The path '/wss' is the Socket.IO engine endpoint
  // The namespace is handled in the handshake

  const socket = io(normalizedNamespace, {
    path: "/wss",
    transports: ["websocket", "polling"],
    autoConnect: true,
    ...opts,
  });

  return socket;
};
