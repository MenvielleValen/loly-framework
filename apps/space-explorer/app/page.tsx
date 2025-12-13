import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, Globe, Calendar, Sparkles, ArrowRight } from "lucide-react";
import type { NASAPOD, SpaceXLaunch } from "@/lib/space-api";
import { cn } from "@/lib/utils";

type HomePageProps = {
  // Props from page server.hook.ts (specific to this page)
  apod: NASAPOD | null;
  recentLaunches: SpaceXLaunch[];
  // Props from layout server.hook.ts (available in all pages!)
  appName?: string;
  navigation?: Array<{ href: string; label: string }>;
};

// Format date consistently for SSR/client hydration
// Using manual formatting instead of toLocaleDateString to avoid hydration mismatches
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export default function HomePage(props: HomePageProps) {
  // Props from page server.hook.ts (app/page.server.hook.ts) - specific to this page
  const { apod = null, recentLaunches = [] } = props || {};
  
  // Props from layout server.hook.ts - also available here!
  // This demonstrates that layout props are merged with page props.
  // Layout props come from app/layout.server.hook.ts
  // Page props come from app/page.server.hook.ts
  // Both are combined and available to both layout and page components
  const { appName, navigation } = props || {};
  
  // Log to console to see the combined props in action
  console.log("🏠 HomePage - Combined Props:", {
    "📄 Page Props (from app/page.server.hook.ts)": { apod, recentLaunches },
    "📐 Layout Props (from app/layout.server.hook.ts)": { appName, navigation },
    "🔗 All Props (merged)": props,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.3_0.15_220),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.25_0.12_200),transparent_60%)] blur-3xl opacity-70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
              <Sparkles className="size-4 animate-pulse" />
              Exploring the universe with real data
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Space Explorer
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Discover planets, space launches, astronauts and the most
              incredible images of the cosmos. All with real-time data
              from NASA and SpaceX.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a href="/planets" className={cn(buttonVariants({ size: "lg" }))}>
                Explore Planets
              </a>
              <a href="/launches" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                View Launches
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Globe className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>8 Planets</CardTitle>
              <CardDescription>
                Explore all planets in the solar system
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/planets" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Rocket className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Launches</CardTitle>
              <CardDescription>
                Latest SpaceX launches in real time
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/launches" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                View launches <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Calendar className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>APOD</CardTitle>
              <CardDescription>
                Astronomy Picture of the Day de NASA
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/apod" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver APOD <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <Sparkles className="mb-2 h-8 w-8 text-primary" />
              <CardTitle>Astronauts</CardTitle>
              <CardDescription>Meet the heroes of space</CardDescription>
            </CardHeader>
            <CardFooter>
              <a href="/astronauts" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                View astronauts <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* APOD Section */}
      {apod && (
        <section className="border-y border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase text-primary">
                Image of the Day
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {apod.title}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {apod.explanation.substring(0, 150)}...
              </p>
            </div>
            <Card className="mx-auto max-w-4xl border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle>{apod.title}</CardTitle>
                <CardDescription>{apod.date}</CardDescription>
              </CardHeader>
              <CardContent>
                {apod.media_type === "image" ? (
                  <img
                    src={apod.url}
                    alt={apod.title}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  {apod.explanation}
                </p>
              </CardContent>
              <CardFooter>
                <a href="/apod" className={cn(buttonVariants())}>
                  View more APOD
                </a>
              </CardFooter>
            </Card>
          </div>
        </section>
      )}

      {/* Recent Launches */}
      {recentLaunches.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Latest Launches
            </h2>
            <p className="mt-2 text-muted-foreground">
              The most recent SpaceX launches
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentLaunches.map((launch: SpaceXLaunch) => (
              <Card
                key={launch.id}
                className="border-border/70 bg-card/70 transition hover:border-primary/40"
              >
                <CardHeader>
                  <CardTitle>{launch.name}</CardTitle>
                  <CardDescription>
                    {formatDate(launch.date_utc)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          launch.success
                            ? "bg-green-500/10 text-green-500"
                            : launch.upcoming
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {launch.upcoming
                          ? "Upcoming"
                          : launch.success
                          ? "Successful"
                          : "Failed"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Flight #{launch.flight_number}
                      </span>
                    </div>
                    {launch.details && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {launch.details}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <a href={`/launches/${launch.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                    View details <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
