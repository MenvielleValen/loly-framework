import React, { Suspense } from "react";
import { Button } from "@components/atoms/Button";

// 👇 Lazy load del componente Comments
const Comments = React.lazy(() => import("./Comments"));

export default function BlogPage({slug, post, user }: any) {
  console.log(post);
  return (
    <main className="bg-red-500 p-4">
      <h3 style={{ fontSize: "1.5rem" }}>Detalle del post</h3>

      
      <p>
        <strong>Slug:</strong> {post?.slug}
      </p>
      <p>
        <strong>Título (SSR):</strong> {post?.title}
      </p>
      <p>
        <strong>Contenido:</strong> {post?.content}
      </p>
      <p>
        <strong>Visto por:</strong>{" "}
        <Button slug={slug}>{post?.viewedBy}</Button>
      </p>

      {user && (
        <p>
          <strong>Usuario (desde loader SSR):</strong> {user?.name} ({user?.role})
        </p>
      )}

      <hr style={{ margin: "2rem 0", opacity: 0.3 }} />

      {/* 🔥 ESTO es Suspense real que NO rompe la hidratación */}
      <Suspense fallback={<p style={{ opacity: 0.7 }}>Cargando comentarios…</p>}>
        <Comments slug={post?.slug} />
      </Suspense>
    </main>
  );
}
