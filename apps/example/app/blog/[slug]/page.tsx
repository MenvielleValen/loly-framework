import { Button } from "@components/atoms/Button";

interface BlogPageProps {
  params: {
    slug: string;
  };
  post: {
    slug: string;
    title: string;
    content: string;
    viewedBy: string;
  };
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

export default function BlogPage({ params, post, user }: BlogPageProps) {
  return (
    <main className="bg-red-500">
      <h3>Detalle del post</h3>
      <p>
        <strong>Slug:</strong> {params.slug}
      </p>
      <p>
        <strong>Título (SSR):</strong> {post.title}
      </p>
      <p>
        <strong>Contenido:</strong> {post.content}
      </p>
      <p>
        <strong>Visto por:</strong> <Button slug={params.slug}>{post.viewedBy}</Button>
      </p>
      {user && (
        <p>
          <strong>Usuario (desde middleware):</strong> {user.name} ({user.role})
        </p>
      )}
    </main>
  );
}
