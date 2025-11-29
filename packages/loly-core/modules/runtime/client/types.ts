import { WINDOW_DATA_KEY } from "./constants";

export type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: { title?: string; description?: string } | null;
  notFound?: boolean;
  error?: boolean;
  theme?: string;
};

declare global {
  interface Window {
    [WINDOW_DATA_KEY]?: InitialData;
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

