import fs from "fs";
import path from "path";
import {
  ApiHandler,
  ApiMiddleware,
  ApiRoute,
  ClientRoute,
  LayoutComponent,
  LoadedRoute,
  PageComponent,
  RouteMiddleware,
  ServerLoader,
} from "./index.types";

import { LAYOUT_FILE_BASENAME, PAGE_FILE_REGEX } from "./constants";

/**
 * Escanea la carpeta `app/` y devuelve todas las rutas encontradas.
 */
export function loadRoutes(appDir: string): LoadedRoute[] {
  if (!fs.existsSync(appDir)) {
    console.warn(`[framework] No se encontró appDir: ${appDir}`);
    return [];
  }

  const routes: LoadedRoute[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!PAGE_FILE_REGEX.test(entry.name)) continue;

      const relDir = path.relative(appDir, currentDir); // '', 'about', 'blog\\[slug]'
      const routePath = buildRoutePathFromDir(relDir);
      const { regex, paramNames } = buildRegexFromRoutePath(routePath);

      // Cargamos componente de page
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);
      const component: PageComponent = mod.default;

      if (!component) {
        console.warn(
          `[framework] El archivo ${fullPath} no exporta default, se ignora.`
        );
        continue;
      }

      const { components: layouts, files: layoutFiles } = loadLayoutsForDir(
        currentDir,
        appDir
      );
      const { middlewares, loader } = loadLoaderForDir(currentDir);

      routes.push({
        pattern: routePath,
        regex,
        paramNames,
        component,
        layouts,
        pageFile: fullPath,
        layoutFiles,
        middlewares: middlewares,
        loader: loader,
      });
    }
  }

  walk(appDir);

  console.log("[framework] Rutas cargadas:");
  for (const r of routes) {
    console.log(`  ${r.pattern}  (layouts: ${r.layouts.length})`);
  }

  return routes;
}

export function loadApiRoutes(appDir: string): ApiRoute[] {
  const apiRoot = path.join(appDir, "api");
  const routes: ApiRoute[] = [];

  if (!fs.existsSync(apiRoot)) return routes;

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      // route.ts / route.tsx / route.js / route.jsx
      if (!/route\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

      const relToApp = path.relative(appDir, fullPath).replace(/\\/g, "/");
      // ej: "api/posts/[id]/route.ts"
      const withoutRoute = relToApp.replace(/\/route\.(ts|tsx|js|jsx)$/, ""); // "api/posts/[id]"
      const pattern = "/" + withoutRoute; // "/api/posts/[id]"

      const { regex, paramNames } = buildRegexFromRoutePath(pattern);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);

      const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
      const handlers: Record<string, ApiHandler> = {};
      const methodMiddlewares: Record<string, ApiMiddleware[]> = {};

      // Handlers por método
      for (const m of httpMethods) {
        if (typeof mod[m] === "function") {
          handlers[m] = mod[m] as ApiHandler;
        }
      }

      // Middlewares globales (para todos los métodos de la ruta)
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

      routes.push({
        pattern,
        regex,
        paramNames,
        handlers,
        middlewares: globalMiddlewares,
        methodMiddlewares,
      });
    }
  }

  walk(apiRoot);

  if (routes.length > 0) {
    console.log("[framework] API routes cargadas:");
    for (const r of routes) {
      console.log(
        `  ${r.pattern}  (methods: ${Object.keys(r.handlers).join(
          ", "
        )}, middlewares: ${r.middlewares.length})`
      );
    }
  }

  return routes;
}

function loadLoaderForDir(dir: string): {
  middlewares: RouteMiddleware[];
  loader?: ServerLoader;
} {
  const candidates = ["loader", "hook"]; // nombres que quieras soportar
  const exts = [".ts", ".tsx", ".js", ".jsx"];

  for (const base of candidates) {
    for (const ext of exts) {
      const file = path.join(dir, base + ext);
      if (!fs.existsSync(file)) continue;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(file);
      const middlewares: RouteMiddleware[] = mod.beforeServerData ?? [];
      const loader: ServerLoader | undefined = mod.getServerSideProps;

      return { middlewares, loader };
    }
  }

  return { middlewares: [], loader: undefined };
}

function buildRoutePathFromDir(relDir: string): string {
  if (!relDir || relDir === ".") return "/";
  const clean = relDir.replace(/\\/g, "/");
  return "/" + clean;
}

function buildRegexFromRoutePath(routePath: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const segments = routePath.split("/").filter(Boolean);
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (const seg of segments) {
    if (seg.startsWith("[") && seg.endsWith("]")) {
      const paramName = seg.slice(1, -1);
      paramNames.push(paramName);
      regexParts.push("([^/]+)");
    } else {
      const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regexParts.push(escaped);
    }
  }

  const regexSource = "^/" + regexParts.join("/") + "/?$";
  const regex = new RegExp(regexSource);
  return { regex, paramNames };
}

/**
 * Sube desde el directorio de la page hasta appDir, y en cada nivel
 * busca un layout.(tsx|ts|jsx|js).
 */
function loadLayoutsForDir(
  pageDir: string,
  appDir: string
): { components: LayoutComponent[]; files: string[] } {
  const componentsBottomUp: LayoutComponent[] = [];
  const filesBottomUp: string[] = [];

  let currentDir = pageDir;
  const appDirResolved = path.resolve(appDir);

  while (true) {
    const layoutFile = findLayoutFileInDir(currentDir);
    if (layoutFile) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(layoutFile);
      const LayoutComp: LayoutComponent = mod.default;
      if (LayoutComp) {
        componentsBottomUp.push(LayoutComp);
        filesBottomUp.push(layoutFile);
      }
    }

    const currentResolved = path.resolve(currentDir);
    if (currentResolved === appDirResolved) break;

    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return {
    components: componentsBottomUp.reverse(), // root → más específico
    files: filesBottomUp.reverse(),
  };
}

function findLayoutFileInDir(dir: string): string | null {
  const candidates = [
    `${LAYOUT_FILE_BASENAME}.tsx`,
    `${LAYOUT_FILE_BASENAME}.ts`,
    `${LAYOUT_FILE_BASENAME}.jsx`,
    `${LAYOUT_FILE_BASENAME}.js`,
  ];

  for (const file of candidates) {
    const fullPath = path.join(dir, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  return null;
}

export function matchRoute(
  routes: LoadedRoute[],
  urlPath: string
): { route: LoadedRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    const match = route.regex.exec(urlPath);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.paramNames.forEach((name, idx) => {
      params[name] = match[idx + 1];
    });

    return { route, params };
  }

  return null;
}

export function matchApiRoute(
  routes: ApiRoute[],
  pathname: string
): { route: ApiRoute; params: Record<string, string> } | null {
  for (const r of routes) {
    const match = r.regex.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, idx) => {
      params[name] = match[idx + 1];
    });

    return { route: r, params };
  }
  return null;
}

// @TODO Separar

export function writeClientRoutesManifest(
  routes: LoadedRoute[],
  projectRoot: string
) {
  const fwDir = path.join(projectRoot, ".fw");
  if (!fs.existsSync(fwDir)) {
    fs.mkdirSync(fwDir, { recursive: true });
  }

  const manifestPath = path.join(fwDir, "routes-client.ts");
  const manifestDir = path.dirname(manifestPath);

  const importMap = new Map<string, string>(); // importPath -> identifier
  const clientRoutes: ClientRoute[] = [];

  function getImportId(filePath: string): string {
    const relRaw = path.relative(manifestDir, filePath).replace(/\\/g, "/");
    const rel = relRaw.startsWith(".") ? relRaw : "./" + relRaw;
    const importPath = rel.replace(/\.(tsx|ts|jsx|js)$/, "");

    if (importMap.has(importPath)) {
      return importMap.get(importPath)!;
    }

    const id = "mod" + importMap.size;
    importMap.set(importPath, id);
    return id;
  }

  for (const route of routes) {
    const pageImportId = getImportId(route.pageFile);
    const layoutImportIds = route.layoutFiles.map(getImportId);

    clientRoutes.push({
      pattern: route.pattern,
      paramNames: route.paramNames,
      pageImportId,
      layoutImportIds,
    });
  }

  const lines: string[] = [];

  // imports estáticos
  for (const [importPath, id] of importMap.entries()) {
    lines.push(`import ${id} from "${importPath}";`);
  }

  lines.push("");
  lines.push(`import React from "react";`);
  lines.push("");
  lines.push("export interface ClientRouteLoaded {");
  lines.push("  pattern: string;");
  lines.push("  paramNames: string[];");
  lines.push("  Page: React.ComponentType<any>;");
  lines.push("  layouts: React.ComponentType<any>[];");
  lines.push("}");
  lines.push("");
  lines.push("export const routes: ClientRouteLoaded[] = [");

  for (const r of clientRoutes) {
    const layoutsArr =
      r.layoutImportIds.length > 0 ? `[${r.layoutImportIds.join(", ")}]` : "[]";

    lines.push("  {");
    lines.push(`    pattern: ${JSON.stringify(r.pattern)},`);
    lines.push(`    paramNames: ${JSON.stringify(r.paramNames)},`);
    lines.push(`    Page: ${r.pageImportId},`);
    lines.push(`    layouts: ${layoutsArr},`);
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");

  fs.writeFileSync(manifestPath, lines.join("\n"), "utf-8");
  console.log(`[framework] Manifest cliente generado en ${manifestPath}`);
}
