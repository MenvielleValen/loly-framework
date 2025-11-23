import type { Application, Request, Response } from "express";
import chokidar from "chokidar";
import path from "path";

export interface HotReloadOptions {
  app: Application;
  appDir: string; // carpeta de la app (ej: apps/example/app)
  route?: string; // endpoint SSE, default: "/__fw/hot"
}

/**
 * Monta un endpoint SSE y un watcher sobre appDir.
 * Cada cambio dispara un "reload" hacia los clientes conectados.
 */
export function setupHotReload({
  app,
  appDir,
  route = "/__fw/hot",
}: HotReloadOptions) {
  const clients = new Set<Response>();

  // Endpoint SSE
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

  // Watcher de archivos de la app
  const watcher = chokidar.watch(appDir, {
    ignoreInitial: true,
    ignored: ["**/node_modules/**", "**/.fw/**", "**/.git/**"],
  });

  function broadcastReload(reason: string, filePath: string) {
    const rel = path.relative(appDir, filePath);
    console.log(`[hot-reload] ${reason}: ${rel}`);

    for (const res of clients) {
      res.write(`event: message\ndata: reload:${rel}\n\n`);
    }
  }

  watcher
    .on("add", (filePath) => broadcastReload("add", filePath))
    .on("change", (filePath) => broadcastReload("change", filePath))
    .on("unlink", (filePath) => broadcastReload("unlink", filePath));

  console.log("[hot-reload] Watching appDir:", appDir);
}
