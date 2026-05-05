import DiscoverPanel from "../discover-panel";

export default function DiscoverPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-sm text-muted-foreground">Trending + suggestions + search.</p>
      </div>

      <DiscoverPanel />
    </div>
  );
}