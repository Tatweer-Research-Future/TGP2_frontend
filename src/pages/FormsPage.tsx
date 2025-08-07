import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FormsPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-96">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">📝 Forms</CardTitle>
          <CardDescription>Form builder coming soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            This page will contain form creation and management tools including
            dynamic form builders, submissions, and analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
