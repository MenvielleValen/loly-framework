/**
 * Sets up hot reload via Server-Sent Events (SSE) in development mode.
 * Listens for file changes and reloads the page when needed.
 * 
 * This module is separate from bootstrap to keep concerns separated
 * and make the code more maintainable.
 */
export function setupHotReload(): void {
  // @ts-ignore - process.env.NODE_ENV is replaced by DefinePlugin at build time
  const nodeEnv: string = (typeof process !== "undefined" && (process as any).env?.NODE_ENV) || "production";
  const isDev = nodeEnv !== "production";
  
  if (!isDev) {
    return;
  }

  try {
    console.log("[hot-reload] Attempting to connect to /__fw/hot...");
    const eventSource = new EventSource("/__fw/hot");
    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

    eventSource.addEventListener("message", (event) => {
      const data = event.data;
      if (data && data.startsWith("reload:")) {
        const filePath = data.slice(7);
        console.log(`[hot-reload] File changed: ${filePath}`);

        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }

        reloadTimeout = setTimeout(() => {
          console.log("[hot-reload] Reloading page...");
          window.location.reload();
        }, 500);
      }
    });

    eventSource.addEventListener("ping", () => {
      console.log("[hot-reload] ✓ Connected to hot reload server");
    });

    eventSource.onopen = () => {
      console.log("[hot-reload] ✓ SSE connection opened");
    };

    eventSource.onerror = (error) => {
      const states = ["CONNECTING", "OPEN", "CLOSED"];
      const state = states[eventSource.readyState] || "UNKNOWN";
      
      if (eventSource.readyState === EventSource.CONNECTING) {
        console.log("[hot-reload] Connecting...");
      } else if (eventSource.readyState === EventSource.OPEN) {
        console.warn("[hot-reload] Connection error (but connection is open):", error);
      } else {
        console.log("[hot-reload] Connection closed (readyState:", state, ")");
      }
    };
  } catch (error) {
    console.log("[hot-reload] EventSource not supported or error:", error);
  }
}

