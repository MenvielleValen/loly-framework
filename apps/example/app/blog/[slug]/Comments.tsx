export default function Comments({ slug }: { slug: string }) {
  // Esto corre SOLO en el cliente (el módulo se carga vía import())
  return (
    <section style={{ padding: "1rem", marginTop: "1rem", background: "#222" }}>
      <h4 style={{ marginBottom: "8px" }}>Comentarios (Cargado con lazy)</h4>
      <p>Acá irían los comentarios del post "{slug}".</p>
    </section>
  );
}