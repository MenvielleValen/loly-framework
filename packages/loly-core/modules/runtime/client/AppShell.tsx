import { useEffect, useState, useRef, useCallback } from "react";
import { RouterView } from "./RouterView";
import {
  navigate,
  createClickHandler,
  createPopStateHandler,
  type NavigationHandlers,
} from "./navigation";
import { RouterContext } from "./RouterContext";
import { ROUTER_NAVIGATE_KEY } from "./constants";
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

  // Create navigate function for router context
  const handleNavigate = useCallback(
    async (
      nextUrl: string,
      options?: { revalidate?: boolean; replace?: boolean }
    ) => {
      await navigate(nextUrl, handlersRef.current, {
        revalidate: options?.revalidate,
      });
    },
    []
  );

  /**
   * SOLUTION: Expose navigate function globally as fallback
   * 
   * During React hydration, components rendered in layouts may execute before
   * RouterContext is fully available. By exposing navigate globally, useRouter
   * can access it even when the context isn't ready yet, ensuring SPA navigation
   * works correctly from the first render.
   * 
   * This is similar to how window.__FW_DATA__ is used for initial data.
   */
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any)[ROUTER_NAVIGATE_KEY] = handleNavigate;
      return () => {
        delete (window as any)[ROUTER_NAVIGATE_KEY];
      };
    }
  }, [handleNavigate]);

  useEffect(() => {
    // Flag para evitar múltiples listeners (por si React Strict Mode ejecuta dos veces)
    let isMounted = true;

    async function handleNavigateInternal(
      nextUrl: string,
      options?: { revalidate?: boolean }
    ) {
      if (!isMounted) return;
      await navigate(nextUrl, handlersRef.current, options);
    }

    const handleClick = createClickHandler(handleNavigateInternal);
    const handlePopState = createPopStateHandler(handleNavigateInternal);

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

  return (
    <RouterContext.Provider value={{ navigate: handleNavigate }}>
      <RouterView key={routeKey} state={state} />
    </RouterContext.Provider>
  );
}

