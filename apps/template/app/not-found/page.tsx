import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
     <h1>404 amig</h1>
     <Button onClick={() => {
      console.log("Click")
     }}>test</Button>
    </main>
  );
}
