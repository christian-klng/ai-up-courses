import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { communityPath } from "@/lib/slug";

/** Course overview of a community. Courses arrive in phase A; until then an empty state. */
export default async function CoursesPage({ params }: PageProps<"/c/[slug]">) {
  const { community, role } = await requireMember((await params).slug);
  const t = await getTranslations("courses");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} />
      <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="size-6" aria-hidden />
        </span>
        <h2 className="font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {role === "admin" ? t("emptyBodyAdmin") : t("emptyBody", { community: community.name })}
        </p>
        {role === "admin" && (
          <Button asChild variant="outline" className="mt-6">
            <Link href={communityPath(community.slug, "/admin/settings")}>{t("toSettings")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
