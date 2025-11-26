import React from "react";

export interface ClientLoadedComponents {
  Page: React.ComponentType<any>;
  layouts: React.ComponentType<any>[];
}

export interface ClientRouteLoaded {
  pattern: string;
  paramNames: string[];
  load: () => Promise<ClientLoadedComponents>;
}

export const routes: ClientRouteLoaded[] = [
];
