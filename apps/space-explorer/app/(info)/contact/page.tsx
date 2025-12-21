import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Github, ExternalLink } from "lucide-react";

type ContactPageProps = {
  // Props from page.server.hook.ts (if exists)
  // Props from (info)/layout.server.hook.ts
  infoTitle?: string;
  infoDescription?: string;
  // Props from root layout.server.hook.ts
  appName?: string;
};

/**
 * Contact page - demonstrates route groups.
 * This page is at app/(info)/contact/page.tsx
 * But the URL is /contact (NOT /info/contact)
 * 
 * The (info) route group provides a shared layout and props.
 */
export default function ContactPage(props: ContactPageProps) {
  const { infoTitle, infoDescription, appName = "Space Explorer" } = props;

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {infoDescription || "Get in touch with the Space Explorer team"}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>
                We'd love to hear from you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Github className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">GitHub</h3>
                    <p className="text-sm text-muted-foreground">
                      Check out the source code and contribute to the project
                    </p>
                    <a
                      href="https://github.com/MenvielleValen/loly-framework"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Visit GitHub <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-sm text-muted-foreground">
                      For questions, suggestions, or support
                    </p>
                    <a
                      href="mailto:support@spaceexplorer.dev"
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      support@spaceexplorer.dev
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Route Group Information</CardTitle>
              <CardDescription>
                This page demonstrates route groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-mono text-muted-foreground mb-2">Current page location:</p>
                <pre className="text-xs overflow-x-auto">
{`app/(info)/contact/page.tsx`}
                </pre>
              </div>
              <p className="text-sm text-muted-foreground">
                This page is inside the <code className="text-xs bg-muted px-1 py-0.5 rounded">(info)</code> route group.
                The URL is <code className="text-xs bg-muted px-1 py-0.5 rounded">/contact</code>, not <code className="text-xs bg-muted px-1 py-0.5 rounded">/info/contact</code>.
              </p>
              <p className="text-sm text-muted-foreground">
                Route groups allow you to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Organize related routes together</li>
                <li>Share layouts and server hooks</li>
                <li>Keep URLs clean and simple</li>
                <li>Apply common styling or functionality to a group of routes</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <a
              href="/about"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Learn More
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

