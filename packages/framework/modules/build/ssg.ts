import fs from "fs";
import path from "path";
import { renderToString } from "react-dom/server";
import type { LoadedRoute, LoaderResult, ServerContext } from "@router/index";
import {
  buildAppTree,
  buildInitialData,
  createDocumentTree,
} from "@rendering/index";

// helper: construye un path real a partir del pattern y params
function buildPathFromPattern(
  pattern: string,
  params: Record<string, string>
): string {
  const segments = pattern.split("/").filter(Boolean);
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      const name = seg.slice(4, -1);
      const value = params[name];
      if (!value) {
        throw new Error(
          `Falta param "${name}" para pattern catch-all "${pattern}"`
        );
      }
      parts.push(value);
    } else if (seg.startsWith("[") && seg.endsWith("]")) {
      const name = seg.slice(1, -1);
      const value = params[name];
      if (!value) {
        throw new Error(`Falta param "${name}" para pattern "${pattern}"`);
      }
      parts.push(encodeURIComponent(value));
    } else {
      parts.push(seg);
    }
  }

  return "/" + parts.join("/");
}

// helper para convertir un path a un directorio de salida
function pathToOutDir(baseDir: string, urlPath: string): string {
  const clean = urlPath === "/" ? "" : urlPath.replace(/^\/+/, "");
  return path.join(baseDir, clean);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

// SSG principal
export async function buildStaticPages(
  projectRoot: string,
  routes: LoadedRoute[]
) {
  const ssgOutDir = path.join(projectRoot, ".fw", "ssg");
  ensureDir(ssgOutDir);

  for (const route of routes) {
    if (route.dynamic !== "force-static") continue;

    let allParams: Array<Record<string, string>> = [];

    if (route.paramNames.length === 0) {
      allParams = [{}];
    } else {
      if (!route.generateStaticParams) {
        console.warn(
          `[framework][ssg] Ruta ${route.pattern} es force-static pero no define generateStaticParams, se omite.`
        );
        continue;
      }
      const sp = await route.generateStaticParams();
      allParams = sp;
    }

    for (const params of allParams) {
      const urlPath = buildPathFromPattern(route.pattern, params);
      await renderStaticRoute(projectRoot, ssgOutDir, route, urlPath, params);
    }
  }

  console.log("[framework][ssg] Build SSG completo.");
}

async function renderStaticRoute(
  projectRoot: string,
  ssgOutDir: string,
  route: LoadedRoute,
  urlPath: string,
  params: Record<string, string>
) {
  console.log(`[framework][ssg] Generando ${urlPath}`);

  const req: any = {
    method: "GET",
    headers: {},
    query: {},
    path: urlPath,
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    get headersSent() {
      return false;
    },
  };

  const ctx: ServerContext = {
    req,
    res,
    params,
    pathname: urlPath,
    locals: {},
  };

  // 1) middlewares
  for (const mw of route.middlewares) {
    await Promise.resolve(
      mw(ctx, async () => {
        /* no-op */
      })
    );
  }

  // 2) loader + metadata
  let loaderResult: LoaderResult = { props: {} };

  if (route.loader) {
    loaderResult = await route.loader(ctx);
  }

  if (route.metadata) {
    loaderResult.metadata = await route.metadata(ctx);
  }

  if (loaderResult.redirect) {
    console.warn(
      `[framework][ssg] Ruta ${urlPath} devolvió redirect en build, se omite en SSG.`
    );
    return;
  }
  if (loaderResult.notFound) {
    console.warn(
      `[framework][ssg] Ruta ${urlPath} devolvió notFound en build, se omite.`
    );
    return;
  }

  const initialData = buildInitialData(urlPath, params, loaderResult);
  const appTree = buildAppTree(route, params, initialData.props);
  const documentTree = createDocumentTree({
    appTree,
    initialData,
    meta: loaderResult.metadata,
    titleFallback: "My Framework Dev",
    descriptionFallback: "Página estática generada por @tuorg/framework.",
  });

  // 🔴 ANTES:
  // const html = "<!DOCTYPE html>" + renderToStaticMarkup(documentTree);

  // ✅ AHORA: markup hidratable, igual que SSR
  const html = "<!DOCTYPE html>" + renderToString(documentTree);

  const dir = pathToOutDir(ssgOutDir, urlPath);
  ensureDir(dir);

  const htmlFile = path.join(dir, "index.html");
  const dataFile = path.join(dir, "data.json");

  fs.writeFileSync(htmlFile, html, "utf-8");
  fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2), "utf-8");
}
