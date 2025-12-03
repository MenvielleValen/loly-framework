import React from "react";

import type { Request, Response } from "express";
import { Server, Socket } from "socket.io";

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

export type RouteMiddleware = (
  ctx: ServerContext & { theme?: string },
  next: () => Promise<void>
) => Promise<void> | void;

export interface LoaderResult {
  props?: Record<string, any>;
  redirect?: { destination: string; permanent?: boolean };
  notFound?: boolean;

  metadata?: PageMetadata | null;
  className?: string;
  theme?: string;
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