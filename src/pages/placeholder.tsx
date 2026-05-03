/**
 * Placeholder pages for features to be implemented in later phases.
 */

import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation("config");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("globalConfig.comingSoon")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("globalConfig.comingSoonDescription")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function GlobalConfigPage() {
  const { t } = useTranslation("config");

  return (
    <PlaceholderPage title={t("globalConfig.title")} description={t("globalConfig.subtitle")} />
  );
}

export function NotFoundPage() {
  const { t } = useTranslation("config");

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-muted-foreground">{t("notFound.title")}</h1>
      <p className="text-lg text-muted-foreground mt-2">{t("notFound.description")}</p>
    </div>
  );
}
