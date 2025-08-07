import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UsersPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-96">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">👥 Users</CardTitle>
          <CardDescription>User management coming soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            This page will contain user management features including user
            profiles, permissions, and account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
