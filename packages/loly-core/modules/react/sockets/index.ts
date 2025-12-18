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
  // SIMPLIFICADO: Siempre usar el origin actual en el navegador
  // Socket.IO maneja el namespace automáticamente
  if (typeof window === "undefined") {
    throw new Error(
      "[loly:socket] lolySocket can only be called on the client side."
    );
  }

  const normalizedNamespace = namespace.startsWith("/") ? namespace : `/${namespace}`;
  
  // Socket.IO: io(namespace, { path: '/wss' })
  // Socket.IO usa window.location.origin automáticamente
  // El path '/wss' es el endpoint del engine de Socket.IO
  // El namespace se maneja en el handshake

  const socket = io(normalizedNamespace, {
    path: "/wss",
    transports: ["websocket", "polling"],
    autoConnect: true,
    ...opts,
  });

  return socket;
};
