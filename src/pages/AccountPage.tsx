import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export function AccountPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('pages.account.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <ConsistentAvatar
            user={{ name: user.name, email: user.email }}
            className="size-16 text-xl"
          />
          <div>
            <div className="text-xl font-semibold">{user.name}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
