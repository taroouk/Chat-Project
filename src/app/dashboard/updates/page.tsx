import UpdatesPanel from "../updates-panel";

export default function UpdatesPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Updates</h1>
        <p className="text-sm text-muted-foreground">Create, edit, delete updates.</p>
      </div>

      <UpdatesPanel />
    </div>
  );
}