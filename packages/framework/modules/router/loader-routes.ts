import fs from "fs";
import path from "path";
import {
  ApiHandler,
  ApiMiddleware,
  ApiRoute,
  LayoutComponent,
  LoadedRoute,
  PageComponent,
  RoutesManifest,
} from "./index.types";
import { buildRegexFromRoutePath } from "./path";
import { loadLoaderForDir } from "./loader";

// 👇 ya la tenés en este archivo, la reusamos
// function buildRegexFromRoutePath(routePath: string): { regex: RegExp; paramNames: string[] } { ... }
// function loadLoaderForDir(currentDir: string) { ... }

/**
 * Carga rutas de PAGES + API leyendo .fw/routes-manifest.json
 * (pensado para PROD, así no volvés a escanear el filesystem).
 */
export function loadRoutesFromManifest(projectRoot: string): {
  routes: LoadedRoute[];
  apiRoutes: ApiRoute[];
} {
  const manifestPath = path.join(projectRoot, ".fw", "routes-manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.warn(
      `[framework] No se encontró routes-manifest.json en ${manifestPath}`
    );
    return { routes: [], apiRoutes: [] };
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: RoutesManifest = JSON.parse(raw);

  // ---------- PAGES ----------
  const pageRoutes: LoadedRoute[] = [];

  for (const entry of manifest.routes) {
    const routePath = entry.pattern;
    const { regex, paramNames } = buildRegexFromRoutePath(routePath);

    const pageFile = path.join(projectRoot, entry.pageFile);
    const layoutFiles = entry.layoutFiles.map((f) => path.join(projectRoot, f));

    // Cargamos el componente de la page
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pageMod = require(pageFile);
    const component: PageComponent = pageMod.default;

    if (!component) {
      console.warn(
        `[framework] El archivo ${pageFile} no exporta default, se ignora.`
      );
      continue;
    }

    // Cargamos layouts a partir de los paths ya resueltos en el manifest
    const layoutMods = layoutFiles.map((lf) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(lf);
      } catch (err) {
        console.warn(`[framework] No se pudo cargar layout ${lf}:`, err);
        return null;
      }
    });

    const layouts: LayoutComponent[] = layoutMods
      .filter((m): m is { default: LayoutComponent } => !!m?.default)
      .map((m) => m.default);

    // Reutilizamos tu lógica de loader/metadata/middlewares por directorio
    const pageDir = path.dirname(pageFile);
    const { middlewares, loader, dynamic, generateStaticParams } =
      loadLoaderForDir(pageDir);

    pageRoutes.push({
      pattern: routePath,
      regex,
      paramNames: entry.paramNames ?? paramNames,
      component,
      layouts,
      pageFile,
      layoutFiles,
      middlewares,
      loader,
      dynamic: entry.dynamic ?? dynamic,
      generateStaticParams,
    });
  }

  // ---------- API ROUTES ----------
  const apiRoutes: ApiRoute[] = [];

  for (const entry of manifest.apiRoutes) {
    const pattern = entry.pattern;
    const { regex, paramNames } = buildRegexFromRoutePath(pattern);
    const filePath = path.join(projectRoot, entry.file);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(filePath);

    const handlers: Record<string, ApiHandler> = {};
    const methodMiddlewares: Record<string, ApiMiddleware[]> = {};
    const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

    // Handlers por método
    for (const m of httpMethods) {
      if (typeof mod[m] === "function") {
        handlers[m] = mod[m] as ApiHandler;
      }
    }

    // Middlewares globales
    const globalMiddlewares: ApiMiddleware[] = Array.isArray(mod.beforeApi)
      ? mod.beforeApi
      : [];

    // Middlewares específicos por método: beforeGET, beforePOST, etc.
    for (const m of httpMethods) {
      const key = `before${m}`; // ej: "beforeGET"
      const mws = (mod as any)[key];
      if (Array.isArray(mws)) {
        methodMiddlewares[m] = mws as ApiMiddleware[];
      }
    }

    apiRoutes.push({
      pattern,
      regex,
      paramNames: entry.paramNames ?? paramNames,
      handlers,
      middlewares: globalMiddlewares,
      methodMiddlewares,
      filePath,
    });
  }

  if (pageRoutes.length > 0) {
    console.log("[framework] Rutas (desde manifest):");
    for (const r of pageRoutes) {
      console.log(`  ${r.pattern}  (layouts: ${r.layouts.length})`);
    }
  }

  if (apiRoutes.length > 0) {
    console.log("[framework] API routes (desde manifest):");
    for (const r of apiRoutes) {
      console.log(
        `  ${r.pattern}  (methods: ${Object.keys(r.handlers).join(
          ", "
        )}, middlewares: ${r.middlewares.length})`
      );
    }
  }

  return { routes: pageRoutes, apiRoutes };
}

export function loadChunksFromManifest(projectRoot: string) {
  const chunksPath = path.join(projectRoot, ".fw", "route-chunks.json");
  let routeChunks: Record<string, string> = {};
  if (fs.existsSync(chunksPath)) {
    try {
      routeChunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8"));
      console.log("[framework][prod] route-chunks.json loaded");
    } catch (err) {
      console.error("[framework][prod] Error leyendo route-chunks.json:", err);
    }
  }

  return routeChunks;
}
