import type { Application, Request, Response } from "express";
import chokidar from "chokidar";
import path from "path";
import { BUILD_FOLDER_NAME } from "@constants/globals";

export interface HotReloadOptions {
  app: Application;
  appDir: string; // carpeta de la app (ej: apps/example/app)
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
  route = "/__fw/hot",
  waitForBuild,
  onFileChange,
}: HotReloadOptions) {
  const clients = new Set<Response>();

  app.get(route, (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`event: ping\ndata: connected\n\n`);
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  });

  const watcher = chokidar.watch(appDir, {
    ignoreInitial: true,
    ignored: ["**/node_modules/**", `**/${BUILD_FOLDER_NAME}/**`, "**/.git/**"],
  });

  async function broadcastReload(reason: string, filePath: string) {
    const rel = path.relative(appDir, filePath);
    console.log(`[hot-reload] ${reason}: ${rel}`);

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

    for (const res of clients) {
      res.write(`event: message\ndata: reload:${rel}\n\n`);
    }
  }

  watcher
    .on("add", (filePath) => broadcastReload("add", filePath))
    .on("change", (filePath) => broadcastReload("change", filePath))
    .on("unlink", (filePath) => broadcastReload("unlink", filePath));
}
