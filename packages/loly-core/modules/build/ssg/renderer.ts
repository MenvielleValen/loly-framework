import fs from "fs";
import path from "path";
import { renderToString } from "react-dom/server";
import { loadChunksFromManifest, type LoadedRoute, type LoaderResult, type ServerContext } from "@router/index";
import {
  buildAppTree,
  buildInitialData,
  buildRouterData,
  createDocumentTree,
} from "@rendering/index";
import { pathToOutDir } from "./path";
import { ensureDir, getClientJsPath, getClientCssPath, loadAssetManifest, getFaviconInfo } from "../utils";
import { type FrameworkConfig } from "@src/config";
import { STATIC_PATH } from "@constants/globals";
import { mergeMetadata } from "../../server/handlers/pages";

/**
 * Renders a static page for SSG.
 * 
 * Executes middlewares and loader, then renders the React component tree
 * to HTML. Writes both the HTML file and the data JSON file.
 * 
 * @param projectRoot - Root directory of the project
 * @param ssgOutDir - SSG output directory
 * @param route - Route definition
 * @param urlPath - URL path for this page
 * @param params - Route parameters
 * 
 * @example
 * await renderStaticRoute(
 *   '/project',
 *   '/project/{BUILD_FOLDER_NAME}/ssg',
 *   route,
 *   '/blog/my-post',
 *   { slug: 'my-post' }
 * );
 */
export async function renderStaticRoute(
  projectRoot: string,
  ssgOutDir: string,
  route: LoadedRoute,
  urlPath: string,
  params: Record<string, string>,
  config?: FrameworkConfig
): Promise<void> {
  const routeChunks = loadChunksFromManifest(projectRoot);
  const assetManifest = loadAssetManifest(projectRoot);
  const clientJsPath = getClientJsPath(projectRoot);
  const clientCssPath = getClientCssPath(projectRoot);
  
  // Detect favicon (in production, favicons should be in /static after build)
  const faviconInfo = config
    ? getFaviconInfo(projectRoot, config.directories.static, false)
    : null;
  
  // Get chunk href with hash if available
  const chunkName = routeChunks[route.pattern];
  let chunkHref: string | null = null;
  if (chunkName != null) {
    if (assetManifest && assetManifest.chunks[chunkName]) {
      chunkHref = `${STATIC_PATH}/${assetManifest.chunks[chunkName]}`;
    } else {
      chunkHref = `${STATIC_PATH}/${chunkName}.js`;
    }
  }

  // Get entrypoint files in order for preload
  const entrypointFiles: string[] = [];
  if (assetManifest?.entrypoints?.client) {
    entrypointFiles.push(...assetManifest.entrypoints.client.map(file => `${STATIC_PATH}/${file}`));
  }

  // Mock request/response objects for SSG
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

  // Execute middlewares
  for (const mw of route.middlewares) {
    await Promise.resolve(
      mw(ctx, async () => {
        /* no-op */
      })
    );
  }

  // 1. Execute layout server hooks (root → specific) and collect props + metadata
  const layoutProps: Record<string, any> = {};
  const layoutMetadata: Array<LoaderResult["metadata"]> = [];

  if (route.layoutServerHooks && route.layoutServerHooks.length > 0) {
    for (let i = 0; i < route.layoutServerHooks.length; i++) {
      const layoutServerHook = route.layoutServerHooks[i];
      if (layoutServerHook) {
        try {
          const layoutResult = await layoutServerHook(ctx);
          // Merge props (more specific layouts override general ones)
          if (layoutResult.props) {
            Object.assign(layoutProps, layoutResult.props);
          }
          // Collect metadata from layouts (will be merged later)
          if (layoutResult.metadata) {
            layoutMetadata.push(layoutResult.metadata);
          }
        } catch (error) {
          // Log error but continue (layout server hook failure shouldn't break SSG)
          console.warn(
            `⚠️  [framework][ssg] Layout server hook ${i} failed for route ${route.pattern}:`,
            error instanceof Error ? error.message : String(error)
          );
          if (error instanceof Error && error.stack) {
            console.warn(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
          }
        }
      }
    }
  }

  // 2. Execute page server hook (getServerSideProps)
  let loaderResult: LoaderResult = { props: {} };

  if (route.loader) {
    loaderResult = await route.loader(ctx);
  }

  // 3. Combine props: layout props (stable) + page props (page overrides layout)
  const combinedProps = {
    ...layoutProps,
    ...(loaderResult.props || {}),
  };

  // 4. Combine metadata: layout metadata (base) + page metadata (page overrides layout)
  // Layout metadata provides defaults (like site-wide Open Graph, canonical base, etc.)
  // Page metadata can override specific fields or add page-specific data
  let combinedMetadata: LoaderResult["metadata"] = null;
  
  // Start with layout metadata (most general first, then more specific)
  // Later layouts override earlier ones, then page overrides all
  for (const layoutMeta of layoutMetadata) {
    if (layoutMeta) {
      combinedMetadata = mergeMetadata(combinedMetadata, layoutMeta);
    }
  }
  
  // Finally, page metadata overrides everything
  if (loaderResult.metadata) {
    combinedMetadata = mergeMetadata(combinedMetadata, loaderResult.metadata);
  }

  // Create combined loader result with merged props and metadata
  const combinedLoaderResult: LoaderResult = {
    ...loaderResult,
    props: combinedProps,
    metadata: combinedMetadata,
  };

  if (combinedLoaderResult.redirect || combinedLoaderResult.notFound) {
    return;
  }

  // Build React component tree with combined props
  const initialData = buildInitialData(urlPath, params, combinedLoaderResult);
  const routerData = buildRouterData(req);
  const appTree = buildAppTree(route, params, initialData.props);
  const documentTree = createDocumentTree({
    appTree,
    initialData,
    routerData,
    meta: combinedLoaderResult.metadata,
    titleFallback: "My Framework Dev",
    descriptionFallback: "Static page generated by @lolyjs/core.",
    chunkHref,
    entrypointFiles,
    clientJsPath,
    clientCssPath,
    includeInlineScripts: true, // SSG needs inline scripts (renderToString doesn't support bootstrapScripts)
    faviconPath: faviconInfo?.path || null,
    faviconType: faviconInfo?.type || null,
  });

  // Render to HTML (hydratable, same as SSR)
  // Note: renderToString doesn't support bootstrapScripts like renderToPipeableStream,
  // so scripts remain in body (acceptable for SSG as it's pre-rendered)
  const html = "<!DOCTYPE html>" + renderToString(documentTree);

  // Write files
  const dir = pathToOutDir(ssgOutDir, urlPath);
  ensureDir(dir);

  const htmlFile = path.join(dir, "index.html");
  const dataFile = path.join(dir, "data.json");

  fs.writeFileSync(htmlFile, html, "utf-8");
  fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2), "utf-8");
}

