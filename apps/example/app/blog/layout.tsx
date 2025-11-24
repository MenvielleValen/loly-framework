interface BlogLayoutProps {
  children: React.ReactNode;
  params: { slug?: string };
  user?: { name: string };
}

export default function BlogLayout({
  children,
  params,
  user,
}: BlogLayoutProps) {
  return (
    <div style={{ border: "1px solid #ccc", padding: 16 }}>
      <h2>Sección Blog</h2>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}
