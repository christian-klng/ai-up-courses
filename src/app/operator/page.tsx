import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireOperator } from "@/server/auth/session";
import { listAllCommunities } from "@/server/domain/communities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PlainFrame } from "@/components/shell/plain-frame";
import { communityPath } from "@/lib/slug";
import { CreateCommunityForm } from "./create-community-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("operator"))("title") };
}

/** Operator area: every community of the installation, and the form to create one. */
export default async function OperatorPage() {
  await requireOperator();
  const [list, t] = await Promise.all([listAllCommunities(), getTranslations("operator")]);
  return (
    <PlainFrame wide signedIn>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t("listTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {list.length === 0 && <CardDescription>{t("empty")}</CardDescription>}
            {list.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                <BrandLogo name={c.name} size={36} color={c.theme.primaryColor} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {communityPath(c.slug)} · {t("members", { count: c.memberCount })}
                  </div>
                </div>
                <a href={communityPath(c.slug)} className="text-sm font-medium underline-offset-4 hover:underline">
                  {t("open")}
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
        <CreateCommunityForm />
      </div>
    </PlainFrame>
  );
}
