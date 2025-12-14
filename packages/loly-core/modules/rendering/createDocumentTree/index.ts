import React, { ReactElement } from "react";
import type { LoaderResult, PageComponent, LoadedRoute, PageMetadata } from "@router/index";
import { InitialData, RouterData } from "../index.types";
import {
  WINDOW_DATA_KEY,
  APP_CONTAINER_ID,
  FAVICON_PATH,
  ROUTER_DATA_KEY,
} from "@constants/globals";

/**
 * Builds the app tree (Page + layouts) in the same way for SSR and SSG.
 *
 * @param route - Route definition
 * @param params - Route parameters
 * @param props - Props from loader
 * @returns React element tree
 */
/**
 * Builds the app tree (Page + layouts) in the same way for SSR and SSG.
 *
 * @param route - Route definition
 * @param params - Route parameters
 * @param props - Props from loader (combined layout + page props)
 * @returns React element tree
 */
export function buildAppTree(
  route: LoadedRoute,
  params: Record<string, string>,
  props: Record<string, any>
): ReactElement {
  const Page = route.component;

  let appTree: ReactElement = React.createElement(Page, {
    params,
    ...props,
  } as any);

  const layoutChain = route.layouts.slice().reverse();

  for (const Layout of layoutChain) {
    appTree = React.createElement(Layout, {
      params,
      ...props,
      children: appTree,
    } as any);
  }

  return appTree;
}

/**
 * Builds the complete HTML document tree. Used by both SSR and SSG.
 *
 * @param options - Document tree options
 * @returns React element representing the HTML document
 */
export function createDocumentTree(options: {
  appTree: ReactElement;
  initialData: InitialData;
  routerData: RouterData;
  meta: LoaderResult<any>["metadata"];
  titleFallback?: string;
  descriptionFallback?: string;
  chunkHref?: string | null;
  entrypointFiles?: string[]; // All JS files for client entrypoint in order (runtime, vendor, commons, entry)
  theme?: string;
  clientJsPath?: string;
  clientCssPath?: string;
  nonce?: string;
  includeInlineScripts?: boolean; // For SSG: include inline scripts in body (renderToString doesn't support bootstrapScripts)
}): ReactElement {
  const {
    appTree,
    initialData,
    routerData,
    meta,
    titleFallback,
    descriptionFallback,
    chunkHref,
    entrypointFiles = [],
    theme,
    clientJsPath = "/static/client.js",
    clientCssPath = "/static/client.css",
    nonce,
    includeInlineScripts = true, // Default true - scripts inline in body for both SSR and SSG
  } = options;

  // Type-safe metadata access
  const metaObj: PageMetadata | null = meta ?? null;
  const title = metaObj?.title ?? titleFallback ?? "My Framework Dev";
  const lang = metaObj?.lang ?? "en";
  const description = metaObj?.description ?? descriptionFallback ?? "Demo Loly framework";

  const extraMetaTags: ReactElement[] = [];
  const linkTags: ReactElement[] = [];

  // Basic meta tags
  if (description) {
    extraMetaTags.push(
      React.createElement("meta", {
        key: "meta-description",
        name: "description",
        content: description,
      })
    );
  }

  if (metaObj?.robots) {
    extraMetaTags.push(
      React.createElement("meta", {
        key: "meta-robots",
        name: "robots",
        content: metaObj.robots,
      })
    );
  }

  if (metaObj?.themeColor) {
    extraMetaTags.push(
      React.createElement("meta", {
        key: "meta-theme-color",
        name: "theme-color",
        content: metaObj.themeColor,
      })
    );
  }

  // Viewport (if custom, otherwise use default)
  if (metaObj?.viewport) {
    extraMetaTags.push(
      React.createElement("meta", {
        key: "meta-viewport",
        name: "viewport",
        content: metaObj.viewport,
      })
    );
  }

  // Canonical URL
  if (metaObj?.canonical) {
    linkTags.push(
      React.createElement("link", {
        key: "link-canonical",
        rel: "canonical",
        href: metaObj.canonical,
      })
    );
  }

  // Open Graph tags
  if (metaObj?.openGraph) {
    const og = metaObj.openGraph;
    
    if (og.title) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-title",
          property: "og:title",
          content: og.title,
        })
      );
    }
    
    if (og.description) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-description",
          property: "og:description",
          content: og.description,
        })
      );
    }
    
    if (og.type) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-type",
          property: "og:type",
          content: og.type,
        })
      );
    }
    
    if (og.url) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-url",
          property: "og:url",
          content: og.url,
        })
      );
    }
    
    if (og.image) {
      if (typeof og.image === "string") {
        extraMetaTags.push(
          React.createElement("meta", {
            key: "og-image",
            property: "og:image",
            content: og.image,
          })
        );
      } else {
        extraMetaTags.push(
          React.createElement("meta", {
            key: "og-image",
            property: "og:image",
            content: og.image.url,
          })
        );
        if (og.image.width) {
          extraMetaTags.push(
            React.createElement("meta", {
              key: "og-image-width",
              property: "og:image:width",
              content: String(og.image.width),
            })
          );
        }
        if (og.image.height) {
          extraMetaTags.push(
            React.createElement("meta", {
              key: "og-image-height",
              property: "og:image:height",
              content: String(og.image.height),
            })
          );
        }
        if (og.image.alt) {
          extraMetaTags.push(
            React.createElement("meta", {
              key: "og-image-alt",
              property: "og:image:alt",
              content: og.image.alt,
            })
          );
        }
      }
    }
    
    if (og.siteName) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-site-name",
          property: "og:site_name",
          content: og.siteName,
        })
      );
    }
    
    if (og.locale) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "og-locale",
          property: "og:locale",
          content: og.locale,
        })
      );
    }
  }

  // Twitter Card tags
  if (metaObj?.twitter) {
    const twitter = metaObj.twitter;
    
    if (twitter.card) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-card",
          name: "twitter:card",
          content: twitter.card,
        })
      );
    }
    
    if (twitter.title) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-title",
          name: "twitter:title",
          content: twitter.title,
        })
      );
    }
    
    if (twitter.description) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-description",
          name: "twitter:description",
          content: twitter.description,
        })
      );
    }
    
    if (twitter.image) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-image",
          name: "twitter:image",
          content: twitter.image,
        })
      );
    }
    
    if (twitter.imageAlt) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-image-alt",
          name: "twitter:image:alt",
          content: twitter.imageAlt,
        })
      );
    }
    
    if (twitter.site) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-site",
          name: "twitter:site",
          content: twitter.site,
        })
      );
    }
    
    if (twitter.creator) {
      extraMetaTags.push(
        React.createElement("meta", {
          key: "twitter-creator",
          name: "twitter:creator",
          content: twitter.creator,
        })
      );
    }
  }

  // Custom meta tags
  if (metaObj?.metaTags && Array.isArray(metaObj.metaTags)) {
    metaObj.metaTags.forEach((tag, index) => {
      extraMetaTags.push(
        React.createElement("meta", {
          key: `meta-custom-${index}`,
          name: tag.name,
          property: tag.property,
          httpEquiv: tag.httpEquiv,
          content: tag.content,
        })
      );
    });
  }

  // Custom link tags
  if (metaObj?.links && Array.isArray(metaObj.links)) {
    metaObj.links.forEach((link, index) => {
      linkTags.push(
        React.createElement("link", {
          key: `link-custom-${index}`,
          rel: link.rel,
          href: link.href,
          as: link.as,
          crossOrigin: link.crossorigin,
          type: link.type,
        })
      );
    });
  }

  // Serialize data for bootstrap scripts
  // For SSR: moved to head via bootstrapScripts in renderToPipeableStream
  // For SSG: included inline in body (renderToString doesn't support bootstrapScripts)
  const serialized = JSON.stringify({
    ...initialData,
    theme,
  });

  const routerSerialized = JSON.stringify({
    ...routerData,
  });

  const bodyChildren: ReactElement[] = [
    React.createElement("div", { id: APP_CONTAINER_ID }, appTree),
  ];

  // Add inline scripts for SSG (renderToString doesn't support bootstrapScripts)
  if (includeInlineScripts) {
    bodyChildren.push(
      React.createElement("script", {
        key: "initial-data",
        nonce: nonce,
        dangerouslySetInnerHTML: {
          __html: `window.${WINDOW_DATA_KEY} = ${serialized};`,
        },
      }),
      React.createElement("script", {
        key: "router-data",
        nonce: nonce,
        dangerouslySetInnerHTML: {
          __html: `window.${ROUTER_DATA_KEY} = ${routerSerialized};`,
        },
      })
    );
  }

  const documentTree = React.createElement(
    "html",
    { lang },
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement("title", null, title),
      // Viewport: use custom if provided, otherwise default
      React.createElement("meta", {
        name: "viewport",
        content: metaObj?.viewport ?? "width=device-width, initial-scale=1",
      }),
      ...extraMetaTags,
      ...linkTags,
      // Preload all entrypoint files except the last one (runtime, vendor, commons)
      // The last file is the main entry which we load as a script
      ...(entrypointFiles.length > 0
        ? entrypointFiles.slice(0, -1).map((file) =>
            React.createElement("link", {
              key: `preload-${file}`,
              rel: "preload",
              href: file,
              as: "script",
            })
          )
        : []),
      // Preload route-specific chunk if available
      chunkHref &&
        React.createElement("link", {
          key: `preload-${chunkHref}`,
          rel: "preload",
          href: chunkHref,
          as: "script",
        }),
      React.createElement("link", {
        rel: "icon",
        href: FAVICON_PATH,
        type: "image/png",
      }),
      React.createElement("link", {
        rel: "stylesheet",
        href: clientCssPath,
      }),
      // Execute ALL entrypoint files in order (runtime, vendor, commons, entry)
      // With defer, browser downloads in parallel but executes in DOM order
      ...(entrypointFiles.length > 0
        ? entrypointFiles.map((file) =>
            React.createElement("script", {
              key: file,
              src: file,
              defer: true,
              nonce, // CSP nonce for external scripts
            })
          )
        : [
            React.createElement("script", {
              key: "client",
              src: clientJsPath,
              defer: true,
              nonce, // CSP nonce for external scripts
            }),
          ])
    ),
    React.createElement(
      "body",
      { 
        style: { margin: 0 }, 
        className: [initialData.className || "", theme].filter(Boolean).join(" "),
        suppressHydrationWarning: true // Allow theme class to differ between server and client initially
      },
      ...bodyChildren
    )
  );

  return documentTree;
}
