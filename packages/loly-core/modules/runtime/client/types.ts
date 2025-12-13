import { WINDOW_DATA_KEY, ROUTER_DATA_KEY } from "./constants";

export type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: { title?: string; description?: string } | null;
  className?: string;
  notFound?: boolean;
  error?: boolean;
  theme?: string;
};

export type RouterData = {
  pathname: string;
  params: Record<string, string>;
  searchParams: Record<string, unknown>;
};

declare global {
  interface Window {
    [WINDOW_DATA_KEY]?: InitialData;
    [ROUTER_DATA_KEY]?: RouterData;
  }
}

export type ClientLoadedComponents = {
  Page: React.ComponentType<any>;
  layouts: React.ComponentType<any>[];
};

export type ClientRouteLoaded = {
  pattern: string;
  paramNames: string[];
  load: () => Promise<ClientLoadedComponents>;
};

export type ClientRouteMatch = {
  route: ClientRouteLoaded;
  params: Record<string, string>;
};

export type RouteViewState = {
  url: string;
  route: ClientRouteLoaded | null;
  params: Record<string, string>;
  components: ClientLoadedComponents | null;
  props: Record<string, any>;
};

