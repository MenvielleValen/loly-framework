export function applyMetadata(
  md?: { title?: string; description?: string } | null
) {
  if (!md) return;

  if (md.title) {
    document.title = md.title;
  }

  if (md.description) {
    let meta = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = md.description;
  }
}

