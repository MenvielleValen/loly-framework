import React from "react";

import type { Request, Response } from "express";

export type PageComponent = React.ComponentType<any>;
export type LayoutComponent = React.ComponentType<any>;

export interface LoadedRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  component: PageComponent;
  layouts: PageComponent[];
  pageFile: string;
  layoutFiles: string[];
  middlewares: RouteMiddleware[];
  loader: ServerLoader | null;

  // ⭐ Nuevos para SSG:
  dynamic: DynamicMode;
  generateStaticParams: GenerateStaticParams | null;
}


export type DynamicMode = "auto" | "force-static" | "force-dynamic";

export type GenerateStaticParams = () =>
  | Array<Record<string, string>>
  | Promise<Array<Record<string, string>>>;

export interface ServerContext {
  req: Request;
  res: Response;
  params: Record<string, string>;
  pathname: string;
  locals: Record<string, any>;
}

export type RouteMiddleware = (
  ctx: ServerContext,
  next: () => Promise<void>
) => Promise<void> | void;

export interface LoaderResult {
  props?: Record<string, any>;
  redirect?: { destination: string; permanent?: boolean };
  notFound?: boolean;

  metadata?: PageMetadata | null;
  className?: string;
}

export type ServerLoader = (ctx: ServerContext) => Promise<LoaderResult>;

export interface ClientRoute {
  pattern: string;
  paramNames: string[];
  pageImportId: string;
  layoutImportIds: string[];
}

//#region API

export interface PageMetadata {
  title?: string;
  description?: string;
  // extensible para el futuro
  metaTags?: {
    name?: string;
    property?: string;
    content: string;
  }[];
}

export type MetadataLoader = (
  ctx: ServerContext
) => PageMetadata | Promise<PageMetadata>;

export interface ApiContext {
  req: Request;
  res: Response;
  Response: (body?: any, status?: number) => Response<any, Record<string, any>>;
  NotFound: (body?: any) => Response<any, Record<string, any>>
  params: Record<string, string>;
  pathname: string;
  locals: Record<string, any>;
}

export type ApiMiddleware = (
  ctx: ApiContext,
  next: () => Promise<void>
) => void | Promise<void>;

export type ApiHandler = (ctx: ApiContext) => void | Promise<void>;

export interface ApiRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];

  // Middlewares que aplican a TODOS los métodos de la ruta
  middlewares: ApiMiddleware[];

  // Middlewares por método, ej: GET, POST, ...
  methodMiddlewares: Record<string, ApiMiddleware[]>;

  // Handlers por método (GET, POST, etc.)
  handlers: Record<string, ApiHandler>;

  filePath: string;
}

export interface PageRouteManifestEntry {
  type: "page";
  pattern: string;             // "/blog/[slug]"
  paramNames: string[];        // ["slug"]
  pageFile: string;            // "app/blog/[slug]/page.tsx" (relativo a root)
  layoutFiles: string[];       // ["app/layout.tsx", "app/blog/layout.tsx"]
  dynamic: DynamicMode;        // "auto" | "force-static" | "force-dynamic"
}

export interface ApiRouteManifestEntry {
  type: "api";
  pattern: string;             // "/api/posts/[id]"
  paramNames: string[];        // ["id"]
  file: string;                // "app/api/posts/[id]/route.ts"
  methods: string[];           // ["GET", "POST"]
}


export interface RoutesManifest {
  version: 1;
  basePath: string;            // por ahora "", pero queda preparado
  caseSensitive: boolean;      // por ahora false si tu router lo trata así
  pages404: boolean;           // por ahora true (tenés _not-found)
  routes: PageRouteManifestEntry[];
  apiRoutes: ApiRouteManifestEntry[];
}