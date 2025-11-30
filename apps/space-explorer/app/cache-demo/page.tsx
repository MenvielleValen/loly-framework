import { usePageProps } from "@loly/core/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { revalidate, revalidatePath } from "@loly/core/client-cache";
import { RefreshCw, Clock, Hash, MessageSquare } from "lucide-react";
import { useState } from "react";

type CacheDemoProps = {
  timestamp: number;
  randomData: number;
  message: string;
  lastUpdated: string;
  counter: number;
};

// Simple component - React will optimize re-renders automatically
function TimestampDisplay() {
  const { props } = usePageProps();
  const typedProps = props as CacheDemoProps;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timestamp Component
        </CardTitle>
        <CardDescription>
          Shows timestamp from server. Updates when revalidated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-mono font-bold">{typedProps.timestamp}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: {new Date(typedProps.timestamp).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

// Simple component - React will optimize re-renders automatically
function RandomDataDisplay() {
  const { props } = usePageProps();
  const typedProps = props as CacheDemoProps;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Random Data Component
        </CardTitle>
        <CardDescription>
          Shows random number. Changes on each revalidation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-mono font-bold text-primary">
          {typedProps.randomData}
        </p>
      </CardContent>
    </Card>
  );
}

// Simple component - React will optimize re-renders automatically
function MessageDisplay() {
  const { props } = usePageProps();
  const typedProps = props as CacheDemoProps;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Message Component
        </CardTitle>
        <CardDescription>
          Shows message from server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg">{typedProps.message}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Updated: {new Date(typedProps.lastUpdated).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

// Separate controls component to prevent unnecessary re-renders
function RevalidationControls() {
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [revalidateCount, setRevalidateCount] = useState(0);

  const handleRevalidate = async () => {
    setIsRevalidating(true);
    setRevalidateCount((prev) => prev + 1);
    try {
      await revalidate();
    } catch (error) {
      console.error("Revalidation error:", error);
    } finally {
      setIsRevalidating(false);
    }
  };

  const handleRevalidatePath = (path: string) => {
    revalidatePath(path);
    alert(`Cache for ${path} has been invalidated. Navigate there to see fresh data.`);
  };

  return (
    <Card className="mb-8 border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle>Revalidation Controls</CardTitle>
        <CardDescription>
          Test cache revalidation features. Components automatically update when data changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleRevalidate}
            disabled={isRevalidating}
            className="min-w-[200px]"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRevalidating ? "animate-spin" : ""}`}
            />
            {isRevalidating
              ? "Revalidating..."
              : "Revalidate Current Page"}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRevalidatePath("/launches")}
          >
            Revalidate /launches
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRevalidatePath("/astronauts")}
          >
            Revalidate /astronauts
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRevalidatePath("/planets")}
          >
            Revalidate /planets
          </Button>
        </div>

        <div className="mt-4 p-4 bg-background rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong>Revalidations performed:</strong> {revalidateCount}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Click "Revalidate Current Page" to fetch fresh data. All components
            using <code className="px-1 py-0.5 bg-muted rounded">usePageProps()</code> will
            automatically update. The hook uses shallow comparison to prevent
            unnecessary re-renders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Main page component - now it won't re-render when controls change
export default function CacheDemoPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            Cache & Revalidation Demo
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Demonstrating Loly's smart caching and revalidation features
          </p>
        </div>

        <RevalidationControls />

        {/* Data Display Components */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TimestampDisplay />
          <RandomDataDisplay />
          <MessageDisplay />
        </div>

        {/* Instructions */}
        <Card className="mt-8 border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1. Smart Revalidation:</strong> Click "Revalidate Current
              Page" to invalidate the cache and fetch fresh data. All components
              using <code className="px-1 py-0.5 bg-muted rounded">usePageProps()</code> will
              automatically update.
            </p>
            <p>
              <strong>2. Shallow Comparison:</strong> The{" "}
              <code className="px-1 py-0.5 bg-muted rounded">usePageProps()</code> hook automatically
              uses shallow comparison to prevent unnecessary re-renders. React
              further optimizes by only updating components whose props actually changed.
            </p>
            <p>
              <strong>3. Path Revalidation:</strong> Use{" "}
              <code className="px-1 py-0.5 bg-muted rounded">revalidatePath()</code> to
              invalidate specific routes. Navigate to those routes to see fresh
              data.
            </p>
            <p>
              <strong>4. LRU Cache:</strong> The cache automatically manages
              memory with an LRU (Least Recently Used) strategy, keeping only
              the most recent 100 routes.
            </p>
            <p className="pt-2 text-xs text-muted-foreground italic">
              💡 <strong>Note:</strong> You don't need to do anything special - just use{" "}
              <code className="px-1 py-0.5 bg-muted rounded">usePageProps()</code> and the framework
              handles all optimizations automatically!
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
