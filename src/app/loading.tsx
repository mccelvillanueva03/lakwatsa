export default function Loading() {
  return (
    <div className="space-y-5" role="status">
      <div className="h-7 w-48 rounded bg-secondary animate-pulse" />
      <div className="h-48 rounded-2xl bg-secondary animate-pulse" />
      <p className="text-muted-foreground">Getting your trip ready…</p>
    </div>
  );
}
