export function BarrelCard() {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="font-medium">Barrel Card</div>
      <p className="text-sm text-muted-foreground">
        Imported via a barrel file that re-exports .client components.
      </p>
    </div>
  );
}

