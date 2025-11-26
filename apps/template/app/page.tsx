import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HomePage({ data }: any) {

  console.log("DESDE EL NAVEGADOR", data)

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.3_0.15_220),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.25_0.12_200),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Loly v1.0 está aquí
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-7xl text-balance">
              {data?.name}{" "}
              <span className="bg-clip-text text-transparent bg-[linear-gradient(to_right,oklch(0.7_0.25_200),oklch(0.75_0.2_180))]">
                ultrarrápido
              </span>
            </h1>

            <p className="mb-10 text-lg leading-relaxed text-muted-foreground sm:text-xl text-pretty">
              Construí aplicaciones web modernas con Loly. Rápido como el rayo,
              simple como vos querés, poderoso cuando lo necesitás.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="text-base font-semibold">
                Empezar ahora
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base font-semibold bg-transparent"
              >
                Ver documentación
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">$</span>
              <code className="rounded bg-muted px-2 py-1 font-mono text-foreground">
                npx create-loly-app@latest
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            ¿Qué hace especial a Loly?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
            Todo lo que necesitás para construir productos increíbles en la web.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "⚡",
              title: "Rendimiento extremo",
              description:
                "Optimizado desde el núcleo. Loly es hasta 10x más rápido que otros frameworks gracias a su compilador inteligente.",
            },
            {
              icon: "🎯",
              title: "Routing basado en archivos",
              description:
                "Organizá tu app de forma intuitiva. Cada archivo en /app es automáticamente una ruta.",
            },
            {
              icon: "🔥",
              title: "Hot Module Replacement",
              description:
                "Cambios instantáneos sin perder el estado. Desarrollá más rápido que nunca.",
            },
            {
              icon: "🎨",
              title: "CSS integrado",
              description:
                "Tailwind, CSS Modules, o lo que prefieras. Todo funciona out-of-the-box.",
            },
            {
              icon: "📦",
              title: "Zero config",
              description:
                "Funciona perfecto desde el minuto uno. Configurá solo si realmente lo necesitás.",
            },
            {
              icon: "🚀",
              title: "Deploy en segundos",
              description:
                "Compatible con todas las plataformas. Deploy con un solo comando.",
            },
          ].map((feature, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
            </Card>
          ))}
        </div>
      </section>

      {/* Code Example Section */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
                Empezá a codear en segundos
              </h2>
              <p className="mb-6 text-lg text-muted-foreground leading-relaxed">
                Con Loly, no perdés tiempo en configuración. Creá tu primera
                página y empezá a construir tu app de inmediato.
              </p>
              <ul className="space-y-3">
                {[
                  "TypeScript incluido por defecto",
                  "Soporte para Server Components",
                  "API Routes integradas",
                  "Optimización automática de imágenes",
                ].map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  app/page.tsx
                </span>
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
              </div>
              <pre className="overflow-x-auto text-sm">
                <code className="text-foreground">
                  {`export default function Page() {
  return (
    <div>
      <h1>¡Hola Loly! 🎉</h1>
      <p>Tu primera página está lista.</p>
    </div>
  )
}`}
                </code>
              </pre>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "10x", label: "Más rápido" },
            { value: "0", label: "Configuración" },
            { value: "100%", label: "TypeScript" },
            { value: "<1s", label: "Hot reload" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="mb-2 bg-clip-text text-5xl font-bold text-transparent bg-[linear-gradient(to_right,oklch(0.7_0.25_200),oklch(0.75_0.2_180))]">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/20 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            ¿Listo para construir algo increíble?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Unite a miles de desarrolladores que ya están usando Loly.
          </p>
          <Button size="lg" className="text-base font-semibold">
            Empezar gratis
          </Button>
        </div>
      </section>
    </main>
  );
}
