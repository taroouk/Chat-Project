import HomeFeed from "./home-feed";

export default function DashboardHomePage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Home</h1>
        <p className="text-sm text-muted-foreground">Your feed + create posts.</p>
      </div>

      <HomeFeed />
    </div>
  );
}