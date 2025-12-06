import { useEffect, useState, useRef } from "react";
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
  const handlersRef = useRef<NavigationHandlers>({
    setState,
    routes,
    notFoundRoute,
    errorRoute,
  });

  // Mantener handlersRef actualizado
  useEffect(() => {
    handlersRef.current = {
      setState,
      routes,
      notFoundRoute,
      errorRoute,
    };
  }, [routes, notFoundRoute, errorRoute]);

  useEffect(() => {
    // Flag para evitar múltiples listeners (por si React Strict Mode ejecuta dos veces)
    let isMounted = true;

    async function handleNavigate(
      nextUrl: string,
      options?: { revalidate?: boolean }
    ) {
      if (!isMounted) return;
      await navigate(nextUrl, handlersRef.current, options);
    }

    const handleClick = createClickHandler(handleNavigate);
    const handlePopState = createPopStateHandler(handleNavigate);

    // Usar capture: false (burbujeo) para que los eventos del input se manejen primero
    window.addEventListener("click", handleClick, false);
    window.addEventListener("popstate", handlePopState, false);

    return () => {
      isMounted = false;
      window.removeEventListener("click", handleClick, false);
      window.removeEventListener("popstate", handlePopState, false);
    };
  }, []); // Solo ejecutar una vez al montar

  const isError = state.route === errorRoute;
  const isNotFound = state.route === notFoundRoute;
  const routeType = isError ? "error" : isNotFound ? "notfound" : "normal";
  const routeKey = `${state.url}:${routeType}`;

  return <RouterView key={routeKey} state={state} />;
}

