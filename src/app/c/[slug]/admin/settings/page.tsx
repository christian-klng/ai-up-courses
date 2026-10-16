import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireCommunityAdmin } from "@/server/auth/session";
import { getCommunityInvite } from "@/server/domain/community-invites";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { JoinLinkCard } from "./join-link-card";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("settings"))("title") };
}

export default async function SettingsPage({ params }: PageProps<"/c/[slug]/admin/settings">) {
  const { community } = await requireCommunityAdmin((await params).slug);
  const [invite, t] = await Promise.all([getCommunityInvite(community.id), getTranslations("settings")]);
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title={t("title")} />
      <SettingsForm
        communityId={community.id}
        initial={{ name: community.name, tagline: community.tagline ?? "", defaultLocale: community.defaultLocale, ...community.theme }}
      />
      <JoinLinkCard communityId={community.id} initial={invite ? { enabled: invite.enabled, url: invite.url, useCount: invite.useCount } : null} />
    </div>
  );
}
