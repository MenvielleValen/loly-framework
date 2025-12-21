import { Link } from "@lolyjs/core/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Globe, Database, Zap } from "lucide-react";

type AboutPageProps = {
  // Props from page.server.hook.ts (if exists)
  // Props from (info)/layout.server.hook.ts
  infoTitle?: string;
  infoDescription?: string;
  // Props from root layout.server.hook.ts
  appName?: string;
};

/**
 * About page - demonstrates route groups.
 * This page is at app/(info)/about/page.tsx
 * But the URL is /about (NOT /info/about)
 * 
 * The (info) route group provides a shared layout and props.
 */
export default function AboutPage(props: AboutPageProps) {
  const { infoTitle, infoDescription, appName = "Space Explorer" } = props;

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">About {appName}</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {infoDescription || "Learn more about this amazing space exploration application"}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>What is Space Explorer?</CardTitle>
              <CardDescription>
                A modern web application for exploring space data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Space Explorer is a full-stack application built with the Loly Framework that
                allows you to explore real data from NASA and SpaceX. Discover planets, track
                space launches, learn about astronauts, and view the Astronomy Picture of the Day.
              </p>
              <p className="text-muted-foreground">
                This application demonstrates modern web development practices including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Server-Side Rendering (SSR)</li>
                <li>Static Site Generation (SSG)</li>
                <li>File-based routing with route groups</li>
                <li>Layout composition and nested layouts</li>
                <li>Real-time WebSocket connections</li>
                <li>API routes and data fetching</li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  <CardTitle>Real Data</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All data comes from real APIs: NASA's Open Data Portal and SpaceX's public API.
                  Information is updated in real-time for launches and daily for APOD.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  <CardTitle>Route Groups</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This page is inside the <code className="text-xs bg-muted px-1 py-0.5 rounded">(info)</code> route group.
                  Route groups organize routes without affecting URLs. The <code className="text-xs bg-muted px-1 py-0.5 rounded">(info)</code> group
                  provides a shared layout for /about and /contact.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  <CardTitle>Built with Loly</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Space Explorer is built with the Loly Framework, a modern React framework
                  with file-based routing, SSR/SSG support, and native WebSocket capabilities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <CardTitle>Fast & Modern</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Built with React 19, TypeScript, and modern tooling for optimal performance
                  and developer experience.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Route Group Example</CardTitle>
              <CardDescription>
                Understanding how route groups work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-mono text-muted-foreground mb-2">File structure:</p>
                <pre className="text-xs overflow-x-auto">
{`app/
├── (info)/
│   ├── layout.tsx          # Layout for info group
│   ├── layout.server.hook.ts
│   ├── about/
│   │   └── page.tsx        # → /about
│   └── contact/
│       └── page.tsx        # → /contact
└── (explore)/
    ├── layout.tsx          # Layout for explore group
    ├── layout.server.hook.ts
    ├── planets/
    │   └── page.tsx        # → /planets
    └── launches/
        └── page.tsx        # → /launches`}
                </pre>
              </div>
              <p className="text-sm text-muted-foreground">
                Notice how the route groups <code className="text-xs bg-muted px-1 py-0.5 rounded">(info)</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">(explore)</code> don't appear in the URLs!
                They're purely organizational and allow sharing layouts and props.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

