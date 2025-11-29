import { useEffect, useState } from "react";
import { RouterView } from "./RouterView";
import {
  navigate,
  createClickHandler,
  createPopStateHandler,
  type NavigationHandlers,
} from "./navigation";
import type {
  RouteViewState,
  ClientRouteLoaded,
} from "./types";

export interface AppShellProps {
  initialState: RouteViewState;
  routes: ClientRouteLoaded[];
  notFoundRoute: ClientRouteLoaded | null;
  errorRoute: ClientRouteLoaded | null;
}

export function AppShell({
  initialState,
  routes,
  notFoundRoute,
  errorRoute,
}: AppShellProps) {
  const [state, setState] = useState<RouteViewState>(initialState);

  useEffect(() => {
    const handlers: NavigationHandlers = {
      setState,
      routes,
      notFoundRoute,
      errorRoute,
    };

    async function handleNavigate(nextUrl: string) {
      await navigate(nextUrl, handlers);
    }

    const handleClick = createClickHandler(handleNavigate);
    const handlePopState = createPopStateHandler(handleNavigate);

    window.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [routes, notFoundRoute, errorRoute]);

  const isError = state.route === errorRoute;
  const isNotFound = state.route === notFoundRoute;
  const routeType = isError ? "error" : isNotFound ? "notfound" : "normal";
  const routeKey = `${state.url}:${routeType}`;

  return <RouterView key={routeKey} state={state} />;
}

