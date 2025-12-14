import type { PageMetadata } from "@router/index";

/**
 * Helper to get or create a meta tag element
 */
function getOrCreateMeta(
  selector: string,
  attributes: { name?: string; property?: string; httpEquiv?: string }
): HTMLMetaElement {
  let meta = document.querySelector(selector) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    if (attributes.name) meta.name = attributes.name;
    if (attributes.property) meta.setAttribute("property", attributes.property);
    if (attributes.httpEquiv) meta.httpEquiv = attributes.httpEquiv;
    document.head.appendChild(meta);
  }
  return meta;
}

/**
 * Helper to get or create a link tag element
 */
function getOrCreateLink(rel: string, href: string): HTMLLinkElement {
  const selector = `link[rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  } else {
    link.href = href;
  }
  return link;
}

/**
 * Updates page metadata in the document head.
 * Supports all metadata fields including Open Graph, Twitter Cards, canonical URLs, etc.
 * 
 * @param md - Page metadata object
 */
export function applyMetadata(md?: PageMetadata | null): void {
  if (!md) return;

  // Title
  if (md.title) {
    document.title = md.title;
  }

  // Description
  if (md.description) {
    const meta = getOrCreateMeta('meta[name="description"]', { name: "description" });
    meta.content = md.description;
  }

  // Robots
  if (md.robots) {
    const meta = getOrCreateMeta('meta[name="robots"]', { name: "robots" });
    meta.content = md.robots;
  }

  // Theme color
  if (md.themeColor) {
    const meta = getOrCreateMeta('meta[name="theme-color"]', { name: "theme-color" });
    meta.content = md.themeColor;
  }

  // Viewport
  if (md.viewport) {
    const meta = getOrCreateMeta('meta[name="viewport"]', { name: "viewport" });
    meta.content = md.viewport;
  }

  // Canonical URL
  if (md.canonical) {
    getOrCreateLink("canonical", md.canonical);
  }

  // Open Graph tags
  if (md.openGraph) {
    const og = md.openGraph;

    if (og.title) {
      const meta = getOrCreateMeta('meta[property="og:title"]', { property: "og:title" });
      meta.content = og.title;
    }

    if (og.description) {
      const meta = getOrCreateMeta('meta[property="og:description"]', { property: "og:description" });
      meta.content = og.description;
    }

    if (og.type) {
      const meta = getOrCreateMeta('meta[property="og:type"]', { property: "og:type" });
      meta.content = og.type;
    }

    if (og.url) {
      const meta = getOrCreateMeta('meta[property="og:url"]', { property: "og:url" });
      meta.content = og.url;
    }

    if (og.image) {
      if (typeof og.image === "string") {
        const meta = getOrCreateMeta('meta[property="og:image"]', { property: "og:image" });
        meta.content = og.image;
      } else {
        const meta = getOrCreateMeta('meta[property="og:image"]', { property: "og:image" });
        meta.content = og.image.url;

        if (og.image.width) {
          const metaWidth = getOrCreateMeta('meta[property="og:image:width"]', { property: "og:image:width" });
          metaWidth.content = String(og.image.width);
        }

        if (og.image.height) {
          const metaHeight = getOrCreateMeta('meta[property="og:image:height"]', { property: "og:image:height" });
          metaHeight.content = String(og.image.height);
        }

        if (og.image.alt) {
          const metaAlt = getOrCreateMeta('meta[property="og:image:alt"]', { property: "og:image:alt" });
          metaAlt.content = og.image.alt;
        }
      }
    }

    if (og.siteName) {
      const meta = getOrCreateMeta('meta[property="og:site_name"]', { property: "og:site_name" });
      meta.content = og.siteName;
    }

    if (og.locale) {
      const meta = getOrCreateMeta('meta[property="og:locale"]', { property: "og:locale" });
      meta.content = og.locale;
    }
  }

  // Twitter Card tags
  if (md.twitter) {
    const twitter = md.twitter;

    if (twitter.card) {
      const meta = getOrCreateMeta('meta[name="twitter:card"]', { name: "twitter:card" });
      meta.content = twitter.card;
    }

    if (twitter.title) {
      const meta = getOrCreateMeta('meta[name="twitter:title"]', { name: "twitter:title" });
      meta.content = twitter.title;
    }

    if (twitter.description) {
      const meta = getOrCreateMeta('meta[name="twitter:description"]', { name: "twitter:description" });
      meta.content = twitter.description;
    }

    if (twitter.image) {
      const meta = getOrCreateMeta('meta[name="twitter:image"]', { name: "twitter:image" });
      meta.content = twitter.image;
    }

    if (twitter.imageAlt) {
      const meta = getOrCreateMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt" });
      meta.content = twitter.imageAlt;
    }

    if (twitter.site) {
      const meta = getOrCreateMeta('meta[name="twitter:site"]', { name: "twitter:site" });
      meta.content = twitter.site;
    }

    if (twitter.creator) {
      const meta = getOrCreateMeta('meta[name="twitter:creator"]', { name: "twitter:creator" });
      meta.content = twitter.creator;
    }
  }

  // Custom meta tags
  if (md.metaTags && Array.isArray(md.metaTags)) {
    md.metaTags.forEach((tag) => {
      let selector = "";
      if (tag.name) {
        selector = `meta[name="${tag.name}"]`;
      } else if (tag.property) {
        selector = `meta[property="${tag.property}"]`;
      } else if (tag.httpEquiv) {
        selector = `meta[http-equiv="${tag.httpEquiv}"]`;
      }

      if (selector) {
        const meta = getOrCreateMeta(selector, {
          name: tag.name,
          property: tag.property,
          httpEquiv: tag.httpEquiv,
        });
        meta.content = tag.content;
      }
    });
  }

  // Custom link tags
  if (md.links && Array.isArray(md.links)) {
    md.links.forEach((link) => {
      getOrCreateLink(link.rel, link.href);
      // Note: Additional attributes like 'as', 'crossorigin', 'type' would need
      // more complex logic to update existing links. For now, we just ensure
      // the link exists with the correct href.
    });
  }
}

