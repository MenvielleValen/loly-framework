import type { Socket } from "socket.io";
import type { AuthFn, AuthContext } from "../types";

/**
 * Executes the auth hook and sets the user on the socket.
 * 
 * @param authFn - The auth function from the route definition
 * @param socket - The Socket.IO socket
 * @param namespace - The namespace path
 * @returns The authenticated user or null
 */
export async function executeAuth(
  authFn: AuthFn | undefined,
  socket: Socket,
  namespace: string
): Promise<any | null> {
  if (!authFn) {
    return null;
  }

  // Build auth context
  const authCtx: AuthContext = {
    req: {
      headers: socket.handshake.headers as Record<string, string | string[] | undefined>,
      ip: socket.handshake.address,
      url: socket.handshake.url,
      cookies: socket.handshake.headers.cookie
        ? parseCookies(socket.handshake.headers.cookie)
        : undefined,
    },
    socket,
    namespace,
  };

  // Execute auth function
  const user = await authFn(authCtx);

  // Store user on socket
  if (user) {
    (socket as any).data = (socket as any).data || {};
    (socket as any).data.user = user;
  }

  return user;
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
