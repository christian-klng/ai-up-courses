import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Shield } from "lucide-react";
import { isOperator, requireAccount } from "@/server/auth/session";
import { listMembershipsForUser } from "@/server/domain/communities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PlainFrame } from "@/components/shell/plain-frame";
import { communityPath } from "@/lib/slug";

/**
 * Start page after sign-in. With exactly one community there is nothing to choose; otherwise the
 * account picks one. Links into a community are plain `<a>`: the root layout renders the theme of
 * the community in the path, and only a full page load changes it.
 */
export default async function StartPage() {
  const user = await requireAccount();
  const [memberships, t] = await Promise.all([listMembershipsForUser(user.id), getTranslations("start")]);
  const operator = isOperator(user);
  if (memberships.length === 1 && !operator) redirect(communityPath(memberships[0].community.slug));

  return (
    <PlainFrame signedIn>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{memberships.length ? t("intro") : t("empty")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {memberships.map(({ community, role }) => (
            <a key={community.id} href={communityPath(community.slug)} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
              <BrandLogo name={community.name} size={36} color={community.theme.primaryColor} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{community.name}</span>
                {community.tagline && <span className="block truncate text-sm text-muted-foreground">{community.tagline}</span>}
              </span>
              {role === "admin" && <Badge variant="secondary">{t("roleAdmin")}</Badge>}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </a>
          ))}
          {operator && (
            <a href="/operator" className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Shield className="size-4" aria-hidden /> {t("operator")}
            </a>
          )}
        </CardContent>
      </Card>
    </PlainFrame>
  );
}
