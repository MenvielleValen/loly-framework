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
    console.log("[loly:AppShell] Setting up event listeners");
    
    // Flag para evitar múltiples listeners (por si React Strict Mode ejecuta dos veces)
    let isMounted = true;
    let listenerCount = 0;

    async function handleNavigate(
      nextUrl: string,
      options?: { revalidate?: boolean }
    ) {
      if (!isMounted) {
        console.warn("[loly:AppShell] navigate called but component is unmounted");
        return;
      }
      console.log("[loly:AppShell] Navigating to", nextUrl, options);
      await navigate(nextUrl, handlersRef.current, options);
    }

    const handleClick = createClickHandler(handleNavigate);
    const handlePopState = createPopStateHandler(handleNavigate);

    // Usar capture: false (burbujeo) para que los eventos del input se manejen primero
    window.addEventListener("click", handleClick, false);
    window.addEventListener("popstate", handlePopState, false);
    listenerCount = 2;
    
    console.log("[loly:AppShell] Event listeners added", {
      clickListener: true,
      popStateListener: true,
      totalListeners: listenerCount,
    });

    return () => {
      console.log("[loly:AppShell] Cleaning up event listeners", {
        wasMounted: isMounted,
        listenersToRemove: listenerCount,
      });
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

