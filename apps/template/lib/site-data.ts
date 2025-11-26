type Feature = {
  title: string
  description: string
  category: string
  icon: string
  points: string[]
}

type LaunchMetric = {
  label: string
  value: string
  helper?: string
}

type TimelineEvent = {
  title: string
  description: string
  status: "listo" | "en progreso" | "proximo"
  eta: string
}

type ChecklistItem = {
  title: string
  description: string
  status: "completo" | "pendiente"
}

export type LaunchInsights = {
  appName: string
  hero: {
    title: string
    tagline: string
    punchline: string
    highlight: string
  }
  metrics: LaunchMetric[]
  release: {
    version: string
    date: string
    notes: string[]
  }
  features: Feature[]
  launchChecklist: ChecklistItem[]
  timeline: TimelineEvent[]
  automation: {
    cli: string[]
    deployment: string
  }
  streamingPreview: {
    file: string
    code: string
  }
}

type DocSection = {
  heading: string
  body: string
}

type DocSnippet = {
  title: string
  code: string
}

type DocChecklistItem = {
  label: string
  status: "ready" | "todo"
}

export type DocPage = {
  id: string
  title: string
  minutes: number
  category: string
  summary: string
  sections: DocSection[]
  checklist: DocChecklistItem[]
  snippets: DocSnippet[]
}

const docsPages: DocPage[] = [
  {
    id: "routing",
    title: "Routing progresivo",
    minutes: 4,
    category: "Core",
    summary:
      "Domina el enrutado basado en archivos, layouts anidados y rutas dinámicas sin tocar configs extras.",
    sections: [
      {
        heading: "Arquitectura basada en archivos",
        body:
          "Cada archivo dentro de /app es una ruta lista para usarse. Los layouts comparten UI y los loaders viven junto a su página, manteniendo todo el contexto en un solo lugar.",
      },
      {
        heading: "Rutas dinámicas y agrupaciones",
        body:
          "Define segmentos como [slug] o [...params] para cubrir casos complejos. Loly resuelve el matcher en build sin costo en runtime.",
      },
    ],
    checklist: [
      { label: "Layouts server-first", status: "ready" },
      { label: "Middlewares por ruta", status: "ready" },
      { label: "Prefetch automático", status: "todo" },
    ],
    snippets: [
      {
        title: "app/blog/[slug]/server.hook.ts",
        code: `import type { ServerLoader } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  const post = await fetchPost(ctx.params.slug)

  return {
    props: { post },
    metadata: {
      title: post.title,
    },
  }
}`,
      },
    ],
  },
  {
    id: "data-layer",
    title: "Capa de datos reactiva",
    minutes: 5,
    category: "Server",
    summary:
      "Combina loaders, APIs y streaming para servir datos frescos sin duplicar lógica en el cliente.",
    sections: [
      {
        heading: "Loaders tipados",
        body:
          "Exportá getServerSideProps y compartí utilidades con middlewares. Loly serializa solo lo necesario para hidratar tus componentes.",
      },
      {
        heading: "APIs con contexto compartido",
        body:
          "Reutiliza middlewares en APIs para validar auth o adjuntar datos previos antes de responder.",
      },
    ],
    checklist: [
      { label: "SSR + streaming", status: "ready" },
      { label: "Respuestas cacheables", status: "ready" },
      { label: "Mutaciones optimistas", status: "todo" },
    ],
    snippets: [
      {
        title: "app/api/pulse/route.ts",
        code: `import type { ApiContext } from "@loly/core";

export async function GET(ctx: ApiContext) {
  const metrics = await getPulse()

  ctx.res.status(200).json(metrics)
}`,
      },
    ],
  },
  {
    id: "styling",
    title: "Styling a medida",
    minutes: 3,
    category: "UI",
    summary:
      "Combina el modo dark, tokens OKLCH y componentes reutilizables para crear UI consistentes en minutos.",
    sections: [
      {
        heading: "Tokens compartidos",
        body:
          "Define los colores una sola vez en app/styles.css y accede a ellos vía Tailwind o CSS nativo.",
      },
      {
        heading: "Componentes desacoplados",
        body:
          "Expone primitivas como Button y Card para que los equipos creen vistas complejas sin pelear con estilos base.",
      },
    ],
    checklist: [
      { label: "Modo dark automático", status: "ready" },
      { label: "Layout responsive", status: "ready" },
      { label: "Temas por espacio de trabajo", status: "todo" },
    ],
    snippets: [
      {
        title: "Ejemplo de Card",
        code: `<Card className="bg-card/60 backdrop-blur">
  <CardHeader>
    <CardTitle>Velocidad</CardTitle>
    <CardDescription>SSR + Streaming</CardDescription>
  </CardHeader>
  <CardContent>Render < 70ms global</CardContent>
</Card>`,
      },
    ],
  },
]

export type DocSummary = {
  id: string
  title: string
  summary: string
  minutes: number
  category: string
}

const launchFeatures: Feature[] = [
  {
    title: "Server-first",
    description: "Middlewares, loaders y streaming en el mismo flujo.",
    category: "Render",
    icon: "🛰️",
    points: [
      "SSR + RSC en un solo build",
      "Hydration progresiva",
      "Datos compartidos vía ctx.locals",
    ],
  },
  {
    title: "Routing atómico",
    description: "Layouts compuestos, slots y rutas anidadas sin configuración extra.",
    category: "Router",
    icon: "🗺️",
    points: [
      "Convenciones conocidas",
      "Handlers para APIs y páginas",
      "Fallbacks listos (_error / _not-found)",
    ],
  },
  {
    title: "Experiencia DX",
    description: "CLI, hot reload y consola contextual para iterar rapidísimo.",
    category: "DX",
    icon: "⚡",
    points: [
      "Comandos predictivos",
      "Logs conectados a rutas",
      "Inspección de props en vivo",
    ],
  },
  {
    title: "UI Opinionada",
    description: "Tokens OKLCH y primitives listas para componer dashboards o landings.",
    category: "UI",
    icon: "🎨",
    points: [
      "Modo dark global",
      "Tailwind v4 listo",
      "Componentes accesibles",
    ],
  },
]

const launchChecklist: ChecklistItem[] = [
  {
    title: "Layout principal responsivo",
    description: "Header sticky, footer accesible y secciones en modo dark.",
    status: "completo",
  },
  {
    title: "SSR + middlewares",
    description: "Datos del dashboard llegan desde el loader server-side.",
    status: "completo",
  },
  {
    title: "API conectada",
    description: "Ruta /api/pulse comparte la capa de datos del landing.",
    status: "completo",
  },
  {
    title: "Docs de onboarding",
    description: "Rutas /docs y /docs/[id] muestran contenido temático.",
    status: "pendiente",
  },
]

const launchTimeline: TimelineEvent[] = [
  {
    title: "Compilador incremental",
    description: "Build paralelo para server/client con invalidación inteligente.",
    status: "listo",
    eta: "Disponible",
  },
  {
    title: "SSR Streaming",
    description: "Payload inicial <20kb y waterfalls eliminadas.",
    status: "listo",
    eta: "GA",
  },
  {
    title: "Edge Middleware",
    description: "Reescrituras y auth en el borde con la misma API.",
    status: "en progreso",
    eta: "Q1",
  },
  {
    title: "Actions nativas",
    description: "Mutaciones seguras desde componentes sin REST extra.",
    status: "proximo",
    eta: "Roadmap",
  },
]

export async function getLaunchInsights(): Promise<LaunchInsights> {
  await new Promise((resolve) => setTimeout(resolve, 40))

  return {
    appName: "Loly",
    hero: {
      title: "Loly Framework",
      tagline: "Full-stack product OS",
      punchline: "Construí experiencias modernas sin pelearte con la infraestructura.",
      highlight: "ultrarrápido",
    },
    metrics: [
      { label: "Requests/seg", value: "182k", helper: "Capturado desde /api/pulse" },
      { label: "Cold start", value: "68ms" },
      { label: "CLI plugins", value: "24" },
      { label: "Teams felices", value: "2.4k" },
    ],
    release: {
      version: "v1.8.0",
      date: "Publicado hace 2 semanas",
      notes: [
        "SSR streaming activado por defecto",
        "Nuevo dev overlay con trazas",
        "CLI create-loly-app@latest con presets",
      ],
    },
    features: launchFeatures,
    launchChecklist,
    timeline: launchTimeline,
    automation: {
      cli: [
        "npx create-loly-app@latest template@spectra",
        "cd my-app && pnpm dev",
        "git push fly master",
      ],
      deployment: "Compatible con Vercel, Fastly, Cloudflare y servers dedicados.",
    },
    streamingPreview: {
      file: "app/components/Hero.tsx",
      code: `export function Hero({ data }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <h1 className="text-5xl font-bold">
        {data.title}
        <span className="text-primary">{data.highlight}</span>
      </h1>
      <p className="text-muted-foreground">
        Datos servidos vía getServerSideProps + streaming.
      </p>
    </section>
  )
}`,
    },
  }
}

export async function getDocsIndex(): Promise<DocSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 20))

  return docsPages.map(({ id, title, summary, minutes, category }) => ({
    id,
    title,
    summary,
    minutes,
    category,
  }))
}

export async function getDocById(id: string): Promise<DocPage | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 10))

  return docsPages.find((doc) => doc.id === id)
}

export type PulseMetrics = {
  requestsPerSecond: number
  latencyP95: number
  deploymentsToday: number
  dominantRegion: string
}

export async function getLivePulse(): Promise<PulseMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 25))

  const regions = ["iad1", "gru1", "mad1", "sfo1"]
  const dominantRegion = regions[Math.floor(Math.random() * regions.length)]

  return {
    requestsPerSecond: 120000 + Math.floor(Math.random() * 8000),
    latencyP95: 32 + Math.floor(Math.random() * 12),
    deploymentsToday: 58 + Math.floor(Math.random() * 6),
    dominantRegion,
  }
}

