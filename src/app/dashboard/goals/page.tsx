import GoalsPanel from "../goals-panel";

export default function GoalsPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-muted-foreground">Weekly planning.</p>
      </div>

      <GoalsPanel />
    </div>
  );
}