import React from "react";

import type { Request, Response } from "express";

export type PageComponent = React.ComponentType<any>;
export type LayoutComponent = React.ComponentType<any>;

export interface LoadedRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  component: PageComponent;
  layouts: LayoutComponent[];

  // Info extra para el manifest cliente
  pageFile: string;
  layoutFiles: string[];

  middlewares: RouteMiddleware[];
  loader?: ServerLoader;
}

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
}

export type ServerLoader = (ctx: ServerContext) => Promise<LoaderResult>;

export interface ClientRoute {
  pattern: string;
  paramNames: string[];
  pageImportId: string;
  layoutImportIds: string[];
}

//#region API

export interface ApiContext {
  req: Request;
  res: Response;
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
  }