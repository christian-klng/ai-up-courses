import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link as LinkIcon } from "lucide-react";
import { getAccount } from "@/server/auth/session";
import { roleIn } from "@/server/domain/communities";
import { resolveCommunityInvite } from "@/server/domain/community-invites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/shell/brand-logo";
import { communityPath } from "@/lib/slug";
import { JoinForm } from "./join-form";
import { JoinButton } from "./join-button";

export async function generateMetadata({ params }: PageProps<"/join/[token]">): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolveCommunityInvite(token);
  return resolved ? { title: resolved.community.name } : {};
}

/**
 * Public page of a community's join link. A signed-in member is forwarded into the community, a
 * signed-in stranger joins with one click, and a visitor leaves name and e-mail and becomes a member
 * by clicking the magic link.
 */
export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const [resolved, account, t] = await Promise.all([resolveCommunityInvite(token), getAccount(), getTranslations("join")]);

  if (!resolved) {
    return (
      <Card>
        <CardHeader>
          <LinkIcon className="size-8 text-muted-foreground" aria-hidden />
          <CardTitle>{t("invalidTitle")}</CardTitle>
          <CardDescription>{t("invalidBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline">
            {t("toLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { community } = resolved;
  if (account && (await roleIn(community.id, account.id))) redirect(communityPath(community.slug));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrandLogo name={community.name} size={40} color={community.theme.primaryColor} />
          <div className="min-w-0">
            <CardTitle className="truncate">{community.name}</CardTitle>
            {community.tagline && <CardDescription className="truncate">{community.tagline}</CardDescription>}
          </div>
        </div>
        <CardDescription className="pt-2">{t("intro", { community: community.name })}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {account ? (
          <>
            <p className="text-sm text-muted-foreground">{t("signedInAs", { email: account.email })}</p>
            <JoinButton token={token} community={community.name} />
          </>
        ) : (
          <JoinForm token={token} />
        )}
      </CardContent>
    </Card>
  );
}
