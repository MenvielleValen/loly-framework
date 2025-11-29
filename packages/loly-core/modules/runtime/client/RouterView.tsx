import type { RouteViewState } from "./types";

export function RouterView({ state }: { state: RouteViewState }) {
  if (!state.route) {
    // Don't show 404 if we're waiting for components to load
    if (state.components === null) {
      return null;
    }
    return <h1>404 - Route not found</h1>;
  }

  if (!state.components) {
    return null;
  }

  const { Page, layouts } = state.components;
  const { params, props } = state;

  let element = <Page params={params} {...props} />;

  const layoutChain = layouts.slice().reverse();
  for (const Layout of layoutChain) {
    element = (
      <Layout params={params} {...props}>
        {element}
      </Layout>
    );
  }

  return element;
}

