import type { Application, Request, Response } from "express";
import chokidar from "chokidar";
import path from "path";
import { BUILD_FOLDER_NAME } from "@constants/globals";

export interface HotReloadOptions {
  app: Application;
  appDir: string; // carpeta de la app (ej: apps/example/app)
  projectRoot?: string; // Project root directory (optional, will be inferred from appDir)
  route?: string; // endpoint SSE, default: "/__fw/hot"
  waitForBuild?: () => Promise<void>; // Function to wait for client bundle to finish building
  onFileChange?: (filePath: string) => void | Promise<void>; // Callback when file changes
}

/**
 * Sets up an SSE endpoint and file watcher on appDir.
 * Each change triggers a reload to connected clients.
 *
 * @param options - Hot reload options
 */
export function setupHotReload({
  app,
  appDir,
  projectRoot,
  route = "/__fw/hot",
  waitForBuild,
  onFileChange,
}: HotReloadOptions) {
  const clients = new Set<Response>();

  app.get(route, (req: Request, res: Response) => {
    // Set proper SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/proxy buffering
    
    // Flush headers immediately
    if (res.flushHeaders) {
      res.flushHeaders();
    } else {
      // Fallback for Express versions without flushHeaders
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
    }

    clients.add(res);
    
    // Send initial ping to confirm connection
    // SSE format: event: <event-type>\ndata: <data>\n\n (double newline required!)
    const pingMessage = "event: ping\ndata: connected\n\n";
    try {
      res.write(pingMessage, "utf-8");
    } catch (error) {
      console.error(`[hot-reload-server] ❌ Error sending ping:`, error);
      clients.delete(res);
    }

    req.on("close", () => {
      clients.delete(res);
    });
    
    req.on("aborted", () => {
      clients.delete(res);
    });
  });
  
  console.log(`[hot-reload-server] ✅ SSE endpoint registered at ${route}`);

  // Determine project root: use provided or infer from appDir
  const resolvedProjectRoot = projectRoot 
    ? path.resolve(projectRoot)
    : path.dirname(path.resolve(appDir));

  // Watch the entire project root to catch changes anywhere
  // This ensures changes in lib/, components/, utils/, or any other directory trigger reload
  // Similar to how the route cache works - monitor everything except excluded dirs
  const watcher = chokidar.watch(resolvedProjectRoot, {
    ignoreInitial: true,
    ignored: [
      "**/node_modules/**",
      `**/${BUILD_FOLDER_NAME}/**`,
      "**/.loly/**", // Ignore build output directory completely
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.cache/**",
      "**/.turbo/**",
      "**/.swc/**",
      "**/coverage/**",
      // Ignore generated files that trigger unnecessary reloads
      "**/*.map", // Source maps
      "**/*.log", // Log files
      "**/.DS_Store", // macOS
      "**/Thumbs.db", // Windows
    ],
    persistent: true,
    ignorePermissionErrors: true,
    // Only watch relevant source files (TypeScript, JavaScript, CSS)
    // Filter out JSON files in build directories
    awaitWriteFinish: {
      stabilityThreshold: 150, // Wait 150ms after file change to trigger event (debounce)
      pollInterval: 50, // Check every 50ms
    },
  });

  // Debounce reload broadcasts to avoid multiple rapid events
  let broadcastTimeout: ReturnType<typeof setTimeout> | null = null;
  const BROADCAST_DEBOUNCE_MS = 300;

  async function broadcastReload(reason: string, filePath: string) {
    // Filter out files that shouldn't trigger reloads
    // Even though chokidar has ignored patterns, some files might still get through
    const normalizedPath = path.normalize(filePath);
    
    // Skip if file is in build directory or is a generated file
    if (
      normalizedPath.includes(BUILD_FOLDER_NAME) ||
      normalizedPath.includes('.loly') ||
      normalizedPath.endsWith('.map') ||
      normalizedPath.endsWith('.log') ||
      normalizedPath.includes('route-chunks.json') ||
      normalizedPath.includes('routes-client.ts') ||
      normalizedPath.includes('/client/route-')
    ) {
      // Silently skip these files - they're generated and shouldn't trigger reloads
      return;
    }

    const rel = path.relative(appDir, filePath);
    console.log(`[hot-reload] ${reason}: ${rel}`);

    // Debounce: clear existing timeout and set new one
    // This prevents multiple rapid file changes from triggering multiple reloads
    if (broadcastTimeout) {
      clearTimeout(broadcastTimeout);
    }

    broadcastTimeout = setTimeout(async () => {
      // Call onFileChange callback if provided (e.g., to reload routes manifest)
      if (onFileChange) {
        try {
          await onFileChange(filePath);
        } catch (error) {
          console.warn("[hot-reload] Error in onFileChange callback:", error);
        }
      }

      // Wait for client bundle to finish building before sending reload event
      if (waitForBuild) {
        try {
          console.log("[hot-reload] Waiting for client bundle to finish...");
          await waitForBuild();
          console.log("[hot-reload] Client bundle ready, sending reload event");
        } catch (error) {
          console.warn("[hot-reload] Error waiting for build:", error);
          // Continue anyway, don't block reload
        }
      }

      // Broadcast to all connected clients
      // SSE format: event: <event-type>\ndata: <data>\n\n (double newline required!)
      const message = `event: message\ndata: reload:${rel}\n\n`;
      console.log(`[hot-reload-server] 📤 Broadcasting reload event to ${clients.size} client(s)`);
      
      let sentCount = 0;
      for (const res of clients) {
        try {
          // Ensure response is still writable
          if (res.writableEnded || res.destroyed) {
            clients.delete(res);
            continue;
          }
          
          res.write(message, "utf-8");
          sentCount++;
        } catch (error) {
          console.error(`[hot-reload-server] ✗ Error sending to client:`, error);
          // Client disconnected, remove from set
          clients.delete(res);
        }
      }
      
      if (sentCount > 0) {
        console.log(`[hot-reload-server] ✅ Reload event sent to ${sentCount} client(s)`);
      }
    }, BROADCAST_DEBOUNCE_MS);
  }

  watcher
    .on("add", (filePath) => broadcastReload("add", filePath))
    .on("change", (filePath) => broadcastReload("change", filePath))
    .on("unlink", (filePath) => broadcastReload("unlink", filePath));
}
