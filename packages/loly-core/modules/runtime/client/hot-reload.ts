/**
 * Sets up hot reload via Server-Sent Events (SSE) in development mode.
 * Listens for file changes and reloads the page when needed.
 * 
 * This module is separate from bootstrap to keep concerns separated
 * and make the code more maintainable.
 */
export function setupHotReload(): void {
  // Only enable hot reload in development mode
  // In production, process.env.NODE_ENV is replaced by DefinePlugin with "production"
  // @ts-ignore - process.env.NODE_ENV is replaced by DefinePlugin at build time
  const nodeEnv: string = (typeof process !== "undefined" && (process as any).env?.NODE_ENV) || "production";
  const isDev = nodeEnv !== "production";
  
  if (!isDev) {
    return; // Skip hot reload in production
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

        // Clear any pending reload
        if (reloadTimeout) {
          clearTimeout(reloadTimeout);
        }

        // Wait a bit for the bundler to finish compiling and files to be written
        reloadTimeout = setTimeout(() => {
          console.log("[hot-reload] Reloading page...");
          // Force reload without cache to ensure we get the latest files
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
      // Log connection state for debugging
      const states = ["CONNECTING", "OPEN", "CLOSED"];
      const state = states[eventSource.readyState] || "UNKNOWN";
      
      if (eventSource.readyState === EventSource.CONNECTING) {
        // Still connecting, might be normal
        console.log("[hot-reload] Connecting...");
      } else if (eventSource.readyState === EventSource.OPEN) {
        console.warn("[hot-reload] Connection error (but connection is open):", error);
      } else {
        // Connection closed - might be production mode or server not running
        console.log("[hot-reload] Connection closed (readyState:", state, ")");
      }
      // EventSource automatically reconnects, so we don't need to do anything
    };
  } catch (error) {
    // Fail silently if EventSource is not supported
    console.log("[hot-reload] EventSource not supported or error:", error);
  }
}

