import SocialPanel from "../social-panel";

export default function SocialPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Social</h1>
        <p className="text-sm text-muted-foreground">Search + following.</p>
      </div>

      <SocialPanel />
    </div>
  );
}