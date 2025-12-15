import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Zap, Shield, Code, ArrowRight, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "@lolyjs/core/components"

type HomePageProps = {
  // Props from page server.hook.ts (specific to this page)
  // Props from layout server.hook.ts (available in all pages!)
  appName?: string
  navigation?: Array<{ href: string; label: string }>
}

export default function HomePage(props: HomePageProps) {
  const { appName = "Loly App" } = props

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Built with Rspack for optimal performance and fast development experience.",
    },
    {
      icon: Shield,
      title: "Type Safe",
      description: "Full TypeScript support with type-safe routing, APIs, and WebSocket events.",
    },
    {
      icon: Code,
      title: "Developer Experience",
      description: "File-based routing, server hooks, and intuitive API design for rapid development.",
    },
    {
      icon: Rocket,
      title: "Full-Stack",
      description: "SSR, SSG, API routes, WebSockets, and route-level middlewares out of the box.",
    },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/10 to-transparent opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 py-32 sm:py-40 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-accent/50 px-4 py-1.5 text-sm text-accent-foreground backdrop-blur-sm">
              <Sparkles className="size-4" />
              Welcome to Loly Framework
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-balance text-foreground sm:text-7xl leading-[1.1]">
              The Modern Framework for{" "}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                High-Performance Apps
              </span>
            </h1>
            <p className="mt-8 text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto text-pretty">
              Build production-ready applications with native WebSocket support, route-level middlewares, and
              enterprise-grade features. Start shipping in minutes.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Link
                href="https://github.com/MenvielleValen/loly-framework"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base font-medium",
                )}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/MenvielleValen/loly-framework/blob/main/packages/loly-core/README.md"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-base font-medium")}
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-foreground">Everything You Need</h2>
          <p className="mt-4 text-lg text-muted-foreground">Powerful features to build modern web applications</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="backdrop-blur-sm hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-4">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {/* CardTitle y CardDescription ya usan variables del theme */}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-border bg-accent/30 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">Ready to Get Started?</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Start building your next application with Loly Framework today.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="https://github.com/MenvielleValen/loly-framework"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base font-medium",
                )}
              >
                View on GitHub
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/MenvielleValen/loly-framework/blob/main/packages/loly-core/README.md"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-base font-medium")}
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
