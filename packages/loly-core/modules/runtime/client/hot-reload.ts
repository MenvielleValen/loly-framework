/**
 * Sets up hot reload via Server-Sent Events (SSE) in development mode.
 * Listens for file changes and reloads the page when needed.
 * 
 * This module is separate from bootstrap to keep concerns separated
 * and make the code more maintainable.
 */
export function setupHotReload(): void {
  // process.env.NODE_ENV is replaced by DefinePlugin at build time
  // DefinePlugin replaces this with a string literal: "development" or "production"
  // @ts-expect-error - process.env.NODE_ENV is replaced at build time by DefinePlugin
  const nodeEnv: string = process.env.NODE_ENV || "production";
  const isDev = nodeEnv === "development";
  
  console.log(`[hot-reload] NODE_ENV: ${nodeEnv}, isDev: ${isDev}`);
  
  if (!isDev) {
    console.log("[hot-reload] Skipping hot reload setup (not in development mode)");
    return;
  }
  
  console.log("[hot-reload] Setting up hot reload client...");

  let eventSource: EventSource | null = null;
  let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 1000; // 1 second
  const RELOAD_DELAY = 100; // Reduced from 500ms to 100ms for faster reload

  function connect(): void {
    try {
      if (eventSource) {
        console.log("[hot-reload] Closing existing EventSource connection");
        eventSource.close();
      }

      const endpoint = "/__fw/hot";
      eventSource = new EventSource(endpoint);
      
      // Register ping listener FIRST (before message) to catch initial ping
      eventSource.addEventListener("ping", (event: Event) => {
        if ('data' in event) {
          console.log("[hot-reload] ✅ Connected to hot reload server");
        }
        reconnectAttempts = 0;
      });

      // Register message listener for reload events
      eventSource.addEventListener("message", (event: MessageEvent) => {
        const data = event.data;
        if (data && typeof data === "string" && data.startsWith("reload:")) {
          const filePath = data.slice(7);
          console.log(`[hot-reload] 📝 File changed: ${filePath}, reloading...`);

          // Clear existing timeout to debounce rapid events
          if (reloadTimeout) {
            clearTimeout(reloadTimeout);
          }

          // Debounce reload - wait a bit in case multiple files change at once
          reloadTimeout = setTimeout(() => {
            try {
              window.location.reload();
            } catch (error) {
              console.error("[hot-reload] ❌ Error reloading page:", error);
              // Fallback: try to reload after a short delay
              setTimeout(() => window.location.reload(), 100);
            }
          }, RELOAD_DELAY);
        }
      });

      eventSource.onopen = () => {
        reconnectAttempts = 0; // Reset on successful connection
      };

      eventSource.onerror = (error) => {
        const states = ["CONNECTING", "OPEN", "CLOSED"];
        const state = states[eventSource?.readyState ?? 0] || "UNKNOWN";
        
        if (eventSource?.readyState === EventSource.CONNECTING) {
          // Still connecting, this is normal
          console.log("[hot-reload] ⏳ Still connecting...");
          return;
        } else if (eventSource?.readyState === EventSource.OPEN) {
          // Connection is open but error occurred (might be temporary)
          console.warn("[hot-reload] ⚠️ Connection error (but connection is open):", error);
        } else {
          // Connection closed, try to reconnect
          console.warn(`[hot-reload] ❌ Connection closed (readyState: ${state})`);
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = RECONNECT_DELAY * reconnectAttempts; // Exponential backoff
            
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }
            
            reconnectTimeout = setTimeout(() => {
              console.log(`[hot-reload] 🔄 Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
              connect();
            }, delay);
          } else {
            console.error("[hot-reload] ❌ Max reconnect attempts reached. Please refresh the page manually.");
          }
        }
      };
    } catch (error) {
      console.error("[hot-reload] ❌ Failed to create EventSource:", error);
      console.error("[hot-reload] EventSource may not be supported in this browser.");
    }
  }

  // Initial connection
  connect();
}

