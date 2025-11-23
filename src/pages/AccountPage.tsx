import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsistentAvatar } from "@/components/ui/consistent-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function AccountPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  type MeResponse = {
    user_id: number;
    user_name: string;
    user_email: string;
    is_staff?: boolean;
    groups: string[];
    bank_info?: {
      account_number?: string | null;
      bank_status?: "submitted" | "approved" | "rejected" | string | null;
    } | null;
  };

  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [accountNumber, setAccountNumber] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch<MeResponse>("/me/");
        if (ignore) return;
        setMe(data);
        const initialAcc = data?.bank_info?.account_number ?? "";
        setAccountNumber(initialAcc ?? "");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const track = useMemo(() => {
    const groups = me?.groups ?? user?.groups ?? [];
    if (!groups?.length) return "N/A";
    const raw = groups[0] ?? "";
    if (raw.includes("->")) {
      const parts = raw.split("->");
      return parts[parts.length - 1]?.trim() || raw.trim();
    }
    return raw.trim();
  }, [me?.groups, user?.groups]);

  const bankStatus = me?.bank_info?.bank_status ?? null;
  const bankBadgeVariant =
    bankStatus === "approved"
      ? "default"
      : bankStatus === "rejected"
      ? "destructive"
      : bankStatus === "submitted"
      ? "secondary"
      : "outline";

  const digitsOnly = (value: string) => value.replace(/\D/g, "");
  const isValidAccountNumber = accountNumber.length === 17;
  const validationError =
    touched && !isValidAccountNumber ? t("errors.bankAccount17Digits") : null;

  const isTrainee = useMemo(() => {
    const groups = me?.groups ?? user?.groups ?? [];
    return groups.some((g) =>
      String(g || "")
        .toLowerCase()
        .includes("trainee")
    );
  }, [me?.groups, user?.groups]);

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  async function handleSave() {
    setTouched(true);
    setSaveError(null);
    if (!isValidAccountNumber) {
      return;
    }
    setSaving(true);
    try {
      const method = me?.bank_info?.account_number ? "PUT" : "POST";
      const isUpdate = method === "PUT";
      const updated = await apiFetch<MeResponse>("/me/", {
        method,
        body: {
          bank_info: {
            account_number: accountNumber,
          },
        },
      });
      setMe(updated);
      // In case backend doesn't echo back, keep local bank_info in sync
      if (!updated?.bank_info) {
        setMe((prev) =>
          prev
            ? {
                ...prev,
                bank_info: {
                  account_number: accountNumber,
                  bank_status: prev.bank_info?.bank_status ?? "submitted",
                },
              }
            : prev
        );
      }
      // Show success toast
      toast.success(
        isUpdate
          ? t("pages.account.bankAccountUpdated", {
              defaultValue: "Bank account updated successfully",
            })
          : t("pages.account.bankAccountAdded", {
              defaultValue: "Bank account added successfully",
            })
      );
    } catch (e: unknown) {
      const errorMessage =
        (e as any)?.data?.detail ||
        t("pages.account.bankAccountSaveError", {
          defaultValue: "Unable to save bank account. Please try again.",
        });
      setSaveError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("pages.account.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <div className="flex items-center gap-6">
            <ConsistentAvatar
              user={{
                name: user.name,
                email: user.email,
                avatar: (user as any).avatar,
              }}
              className="size-16 text-xl"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold">
                  {me?.user_name || user.name}
                </div>
                {bankStatus && (
                  <Badge variant={bankBadgeVariant as any}>
                    {t(`bank.status.${bankStatus}`, {
                      defaultValue: capitalize(String(bankStatus)),
                    })}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {me?.user_email || user.email}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{t("navigation.track")}:</span>{" "}
                {track}
              </div>
            </div>
          </div>

          {isTrainee && (
            <>
              <FieldSeparator>
                {t("pages.account.bankSectionTitle")}
              </FieldSeparator>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldContent>
                      <Label htmlFor="accountNumber">
                        {t("pages.account.bankAccountNumber")}
                      </Label>
                      <Input
                        id="accountNumber"
                        inputMode="numeric"
                        placeholder={t(
                          "pages.account.bankAccountNumberPlaceholder"
                        )}
                        value={accountNumber}
                        onChange={(e) => {
                          const next = digitsOnly(e.target.value).slice(0, 17);
                          setAccountNumber(next);
                        }}
                        onBlur={() => setTouched(true)}
                        aria-invalid={!!validationError}
                      />

                      <FieldError>{validationError}</FieldError>
                    </FieldContent>
                  </Field>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={saving || isLoading || !!validationError}
                    >
                      {saving
                        ? t("pages.account.saving")
                        : me?.bank_info?.account_number
                        ? t("common.buttons.update")
                        : t("common.buttons.add")}
                    </Button>
                    {saveError && (
                      <div className="text-destructive text-sm self-center">
                        {saveError}
                      </div>
                    )}
                  </div>
                </FieldGroup>
              </FieldSet>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
