import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { RouterView } from "./RouterView";
import {
  navigate,
  createClickHandler,
  createPopStateHandler,
  createHoverHandler,
  type NavigationHandlers,
} from "./navigation";
import { RouterContext } from "./RouterContext";
import { ROUTER_NAVIGATE_KEY, WINDOW_DATA_KEY } from "./constants";
import { applyMetadata } from "./metadata";
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
   * Using useLayoutEffect ensures this happens synchronously before paint,
   * making it available as early as possible during hydration.
   * 
   * This is similar to how window.__FW_DATA__ is used for initial data.
   */
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window[ROUTER_NAVIGATE_KEY] = handleNavigate;
      return () => {
        delete window[ROUTER_NAVIGATE_KEY];
      };
    }
  }, [handleNavigate]);

  useEffect(() => {
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
    const handleHover = createHoverHandler(routes, notFoundRoute);

    window.addEventListener("click", handleClick, false);
    window.addEventListener("popstate", handlePopState, false);
    window.addEventListener("mouseover", handleHover, false);

    return () => {
      isMounted = false;
      window.removeEventListener("click", handleClick, false);
      window.removeEventListener("popstate", handlePopState, false);
      window.removeEventListener("mouseover", handleHover, false);
    };
  }, [routes, notFoundRoute]);

  // Listen for data refresh events and update state when current route is revalidated
  useEffect(() => {
    const handleDataRefresh = () => {
      const freshData = window[WINDOW_DATA_KEY];
      
      if (!freshData) return;
      
      const currentPathname = window.location.pathname;
      const freshPathname = freshData.pathname;
      
      if (freshPathname === currentPathname) {
        if (freshData.metadata !== undefined) {
          applyMetadata(freshData.metadata);
        }
        
        setState((prevState) => ({
          ...prevState,
          props: freshData.props ?? prevState.props,
          params: freshData.params ?? prevState.params,
        }));
      }
    };

    window.addEventListener("fw-data-refresh", handleDataRefresh);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
    };
  }, []); // Empty deps - only register once, not when state.url changes

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

