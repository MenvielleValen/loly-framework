import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Sparkles } from "lucide-react";
import type { NASAPOD } from "@/lib/space-api";

type APODPageProps = {
  apod: NASAPOD;
};

export default function APODPage(props: APODPageProps) {
  const { apod } = props || {};

  if (!apod) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading image of the day...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Astronomy Picture of the Day
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Image of the Day</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Discover the most incredible images of the cosmos, courtesy of NASA
          </p>
        </div>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardDescription>{apod.date}</CardDescription>
            </div>
            <CardTitle className="text-2xl">{apod.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apod.media_type === "image" ? (
              <img
                src={apod.hdurl || apod.url}
                alt={apod.title}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Video not available</p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {apod.explanation}
              </p>
            </div>
            {apod.hdurl && (
              <div className="text-center">
                <a
                  href={apod.hdurl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View image in high resolution
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

