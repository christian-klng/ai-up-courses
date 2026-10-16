import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("notFoundTitle")}</CardTitle>
          <CardDescription>{t("notFoundBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* full load: leaves a community's theme behind */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="text-sm font-medium underline-offset-4 hover:underline">
            {t("toStart")}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
