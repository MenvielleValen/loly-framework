import { Link } from "@lolyjs/core/components";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, ArrowRight, Calendar } from "lucide-react";
import type { SpaceXLaunch } from "@/lib/space-api";
import { revalidate, revalidatePath } from "@lolyjs/core/client-cache";

type LaunchesPageProps = {
  launches: SpaceXLaunch[];
  randomNumber: number;
};

export default function LaunchesPage(props: any) {
  const { launches = [] } = (props as LaunchesPageProps) || {};

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            SpaceX Launches {props.randomNumber}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Explore the most recent SpaceX launches
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {launches.map((launch: SpaceXLaunch) => (
            <Card
              key={launch.id}
              className="border-border/70 bg-card/70 transition hover:border-primary/40"
            >
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  <CardTitle className="line-clamp-2">{launch.name}</CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(launch.date_utc).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href={`/launches/${launch.id}`}>
                    View details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

