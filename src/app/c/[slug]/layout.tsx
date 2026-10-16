import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isOperator, requireMember } from "@/server/auth/session";
import { listMembershipsForUser } from "@/server/domain/communities";
import { signOut } from "@/server/actions/auth";
import { AppShell, type ShellCommunity } from "@/components/shell/app-shell";
import type { Community } from "@/server/db/schema";

export async function generateMetadata({ params }: LayoutProps<"/c/[slug]">): Promise<Metadata> {
  const { community } = await requireMember((await params).slug);
  return { title: { default: community.name, template: `%s · ${community.name}` } };
}

const toShell = (c: Community): ShellCommunity => ({ slug: c.slug, name: c.name, tagline: c.tagline, color: c.theme.primaryColor });

/** Everything under /c/<slug> requires an active membership; strangers get a 404. */
export default async function CommunityLayout({ children, params }: LayoutProps<"/c/[slug]">) {
  const { user, community, role } = await requireMember((await params).slug);
  const [memberships, tn, tc] = await Promise.all([listMembershipsForUser(user.id), getTranslations("nav"), getTranslations("common")]);

  return (
    <AppShell
      community={toShell(community)}
      communities={memberships.map((m) => toShell(m.community))}
      user={{ name: user.name, email: user.email, isAdmin: role === "admin", isOperator: isOperator(user) }}
      labels={{
        courses: tn("courses"),
        administration: tn("administration"),
        settings: tn("settings"),
        members: tn("members"),
        communities: tn("communities"),
        switchCommunity: tn("switchCommunity"),
        operator: tn("operator"),
        signOut: tc("signOut"),
        menu: tc("menu"),
        language: tc("language"),
        theme: tc("theme"),
        themeLight: tc("themeLight"),
        themeDark: tc("themeDark"),
        themeSystem: tc("themeSystem"),
      }}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
