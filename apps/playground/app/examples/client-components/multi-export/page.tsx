import PrimaryButton, { SecondaryButton } from "@/components/examples/MultiExport.client";

export default function MultiExportPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Multiple Exports in One .client.tsx</h1>
          <p className="text-muted-foreground">
            Valida que el loader soporte default + named exports dentro del mismo archivo .client.tsx.
          </p>
        </header>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton />
          <SecondaryButton />
        </div>
      </div>
    </div>
  );
}

