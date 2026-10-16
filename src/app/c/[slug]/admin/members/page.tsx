import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireCommunityAdmin } from "@/server/auth/session";
import { listMembers } from "@/server/domain/communities";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberActions } from "./member-actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("members"))("title") };
}

export default async function MembersPage({ params }: PageProps<"/c/[slug]/admin/members">) {
  const { community, user } = await requireCommunityAdmin((await params).slug);
  const [members, t, format] = await Promise.all([listMembers(community.id), getTranslations("members"), getFormatter()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("joined")}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className={m.status === "suspended" ? "opacity-60" : undefined}>
                <TableCell>
                  <div className="font-medium">
                    {m.name} {m.id === user.id && <span className="font-normal text-muted-foreground">({t("you")})</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={m.role === "admin" ? "default" : "secondary"}>{m.role === "admin" ? t("roleAdmin") : t("roleMember")}</Badge>
                    {m.status === "suspended" && <Badge variant="outline">{t("suspended")}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{format.dateTime(m.joinedAt, { dateStyle: "medium" })}</TableCell>
                <TableCell>
                  <MemberActions communityId={community.id} member={{ id: m.id, role: m.role, status: m.status }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
