import { useTranslation } from "react-i18next";

export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold">{t("pages.home.title", { defaultValue: "Home" })}</h1>
    </div>
  );
}


