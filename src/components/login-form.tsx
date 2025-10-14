import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
// auth handled via context
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
// import AubergineImage from "@/assets/avatars/Aubergine.svg";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await authLogin({ email, password });
      toast.success(`${t('auth.welcome')} ${data.user?.name || data.user?.email}`);
      // Determine redirect: trainees -> /forms, instructors -> /candidates
      try {
        const storedRaw = localStorage.getItem("auth_user");
        const stored = storedRaw ? JSON.parse(storedRaw) : null;
        const groups: string[] = Array.isArray(stored?.groups) ? stored.groups : [];
        const isTrainee = groups.some((g) => /trainee/i.test(g));
        const defaultPath = isTrainee ? "/forms" : "/candidates";
        const redirectTo = (location.state as any)?.from?.pathname || defaultPath;
        navigate(redirectTo, { replace: true });
      } catch {
        const redirectTo = (location.state as any)?.from?.pathname || "/candidates";
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      const message =
        (err as any)?.data?.detail || (err as Error)?.message || t('auth.loginFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{t('auth.welcome')}</h1>
                <p className="text-muted-foreground text-balance">
                  {t('pages.login.subtitle')}
                </p>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">{t('forms.email.label')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('forms.email.placeholder')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">{t('forms.password.label')}</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('forms.password.placeholder')}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('auth.login') + "..." : t('auth.login')}
              </Button>
              {/** Social login buttons removed */}
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/assets/avatars/Dark Nature.svg"
              alt="TGP evaluation Login Background"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
