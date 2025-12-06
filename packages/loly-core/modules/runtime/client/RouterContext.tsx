import { createContext, useContext } from "react";

export type NavigateFunction = (
  url: string,
  options?: { revalidate?: boolean; replace?: boolean }
) => Promise<void>;

export interface RouterContextValue {
  navigate: NavigateFunction;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouterContext(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error(
      "useRouter must be used within a RouterProvider. Make sure you're using it inside a Loly app."
    );
  }
  return context;
}
