export default function BlogCatchAllPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug; // ej: "a/b/c"
  const segments = slug.split("/");

  return (
    <main className="space-y-2">
      <h2 className="text-lg font-semibold text-emerald-400">Blog catch-all</h2>
      <p>
        <strong>Raw slug:</strong> {slug}
      </p>
      <p>
        <strong>Segments:</strong> {segments.join(" · ")}
      </p>
    </main>
  );
}
