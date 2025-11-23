export default function BlogCatchAllPage(props: any) {
  const slug = props?.params?.slug; // ej: "a/b/c"

  console.log("[BlogCatchAllPage] props en cliente:", props);

  return (
    <main className="space-y-2">
      <h2 className="text-lg font-semibold text-emerald-400">Blog catch-all</h2>
      <p>
        <strong>Raw slug:</strong> {slug}
      </p>
    </main>
  );
}
