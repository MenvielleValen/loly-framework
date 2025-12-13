import React from "react";

import type { Request, Response } from "express";
import { Server, Socket } from "socket.io";

/**
 * Page component type. Accepts props that extend a base object with params.
 * @template TProps - Type of props passed to the component (defaults to Record<string, any>)
 */
export type PageComponent<TProps extends Record<string, any> = Record<string, any>> = React.ComponentType<
  TProps & { params: Record<string, string> }
>;

/**
 * Layout component type. Accepts props that extend a base object with params and children.
 * @template TProps - Type of props passed to the layout (defaults to Record<string, any>)
 */
export type LayoutComponent<TProps extends Record<string, any> = Record<string, any>> = React.ComponentType<
  TProps & { params: Record<string, string>; children: React.ReactNode }
>;

/**
 * Route definition loaded from the filesystem or manifest.
 * @template TPageProps - Type of props for the page component (defaults to Record<string, any>)
 * @template TLayoutProps - Type of props for layout components (defaults to Record<string, any>)
 */
export interface LoadedRoute<
  TPageProps extends Record<string, any> = Record<string, any>,
  TLayoutProps extends Record<string, any> = Record<string, any>
> {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  component: PageComponent<TPageProps>;
  layouts: LayoutComponent<TLayoutProps>[];
  pageFile: string;
  layoutFiles: string[];
  middlewares: RouteMiddleware[];
  /** Server hook (getServerSideProps) from the page's server.hook.ts file */
  loader: ServerLoader<TPageProps> | null;
  /** Server hooks (getServerSideProps) from each layout's server.hook.ts file, in same order as layouts array */
  layoutServerHooks?: (ServerLoader<TLayoutProps> | null)[];
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

export interface WssActions {
  /**
   * Emit an event to all clients in the namespace
   */
  emit: (event: string, ...args: any[]) => void;
  
  /**
   * Emit an event to a specific socket by Socket.IO socket ID
   */
  emitTo: (socketId: string, event: string, ...args: any[]) => void;
  
  /**
   * Emit an event to a specific client by custom clientId
   * Requires clientId to be stored in socket.data.clientId during connection
   */
  emitToClient: (clientId: string, event: string, ...args: any[]) => void;
  
  /**
   * Broadcast an event to all clients in the namespace except the sender
   */
  broadcast: (event: string, ...args: any[]) => void;
}

export interface WssContext {
  socket: Socket;
  io: Server;
  params: Record<string, string>;
  pathname: string;
  data?: any;
  actions: WssActions;
}

/**
 * Route middleware function type.
 * Middlewares run before getServerSideProps and can modify ctx.locals, set headers, redirect, etc.
 * 
 * @param ctx - Server context with optional theme
 * @param next - Function to call the next middleware in the chain (must be awaited if used)
 * @returns Promise<void> | void
 * 
 * @example
 * // Simple middleware that adds data to ctx.locals
 * export const beforeServerData: RouteMiddleware[] = [
 *   async (ctx, next) => {
 *     ctx.locals.user = await getUser(ctx.req);
 *     await next();
 *   }
 * ];
 * 
 * @example
 * // Middleware that redirects
 * export const beforeServerData: RouteMiddleware[] = [
 *   async (ctx, next) => {
 *     if (!ctx.locals.user) {
 *       ctx.res.redirect('/login');
 *       return; // Don't call next() if redirecting
 *     }
 *     await next();
 *   }
 * ];
 */
export type RouteMiddleware = (
  ctx: ServerContext & { theme?: string },
  next: () => Promise<void>
) => Promise<void> | void;

/**
 * Result returned by a server loader (getServerSideProps).
 * @template TProps - Type of props that will be passed to the component (defaults to Record<string, any>)
 */
export interface LoaderResult<TProps extends Record<string, any> = Record<string, any>> {
  props?: TProps;
  redirect?: { destination: string; permanent?: boolean };
  notFound?: boolean;

  metadata?: PageMetadata | null;
  className?: string;
  theme?: string;
}

/**
 * Server loader function type (getServerSideProps).
 * This function is exported from server.hook.ts files.
 * 
 * @template TProps - Type of props that will be returned (defaults to Record<string, any>)
 * 
 * @example
 * // Typed loader
 * export const getServerSideProps: ServerLoader<{ user: User; posts: Post[] }> = async (ctx) => ({
 *   props: { user: await getUser(), posts: await getPosts() }
 * });
 * 
 * @example
 * // Untyped loader (backward compatible)
 * export const getServerSideProps: ServerLoader = async (ctx) => ({
 *   props: { any: 'data' }
 * });
 */
export type ServerLoader<TProps extends Record<string, any> = Record<string, any>> = (
  ctx: ServerContext
) => Promise<LoaderResult<TProps>>;

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

/**
 * API middleware function type.
 * Middlewares run before the API handler and can modify ctx.locals, set headers, etc.
 * 
 * @param ctx - API context
 * @param next - Function to call the next middleware in the chain (must be awaited if used)
 * @returns Promise<void> | void
 * 
 * @example
 * // Authentication middleware
 * export const middlewares: ApiMiddleware[] = [
 *   async (ctx, next) => {
 *     const token = ctx.req.headers.authorization;
 *     if (!token) {
 *       return ctx.Response({ error: 'Unauthorized' }, 401);
 *     }
 *     ctx.locals.user = await verifyToken(token);
 *     await next();
 *   }
 * ];
 */
export type ApiMiddleware = (
  ctx: ApiContext,
  next: () => Promise<void>
) => void | Promise<void>;

/**
 * API handler function type.
 * Handles the actual API request after all middlewares have run.
 * 
 * @param ctx - API context
 * @returns Promise<void> | void
 * 
 * @example
 * export const GET: ApiHandler = async (ctx) => {
 *   const user = ctx.locals.user;
 *   return ctx.Response({ user }, 200);
 * };
 */
export type ApiHandler = (ctx: ApiContext) => void | Promise<void>;
export type WssHandler = (ctx: WssContext) => void | Promise<void>;

export interface ApiRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];

  // Global middlewares
  middlewares: ApiMiddleware[];

  // Middlewares GET, POST, ...
  methodMiddlewares: Record<string, ApiMiddleware[]>;

  // Handlers(GET, POST, etc.)
  handlers: Record<string, ApiHandler>;

  filePath: string;
}

export interface WssRoute extends ApiRoute {}

export interface PageRouteManifestEntry {
  type: "page";
  pattern: string;            
  paramNames: string[];     
  pageFile: string; 
  layoutFiles: string[];     
  dynamic: DynamicMode;       
}

export interface ApiRouteManifestEntry {
  type: "api";
  pattern: string;          
  paramNames: string[];  
  file: string;             
  methods: string[];          
}

export interface WssRouteManifestEntry {
  type: "wss";
  pattern: string;          
  paramNames: string[];  
  file: string;             
  events: string[];          
}

export interface RoutesManifest {
  version: 1;
  basePath: string;        
  caseSensitive: boolean;  
  pages404: boolean;       
  routes: PageRouteManifestEntry[];
  apiRoutes: ApiRouteManifestEntry[];
  wssRoutes: WssRouteManifestEntry[];
  notFound: PageRouteManifestEntry;
  error?: PageRouteManifestEntry;
}