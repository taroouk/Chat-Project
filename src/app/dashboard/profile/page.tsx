import ProfileSettings from "../profile-settings";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Section</div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Username + public page.</p>
      </div>

      <ProfileSettings />
    </div>
  );
}