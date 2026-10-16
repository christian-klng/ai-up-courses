"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, MoreHorizontal, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { setMemberRoleAction, setMemberStatusAction, type MemberActionResult } from "@/server/actions/community-admin";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Member = { id: string; role: "admin" | "member"; status: "active" | "suspended" };

export function MemberActions({ communityId, member }: { communityId: string; member: Member }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (work: () => Promise<MemberActionResult>) =>
    start(async () => {
      try {
        const res = await work();
        if (!res.ok) toast.error(res.reason === "last_admin" ? t("lastAdmin") : tc("unexpectedError"));
        router.refresh();
      } catch {
        toast.error(tc("unexpectedError"));
      }
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label={t("actions")}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.role === "member" ? (
          <DropdownMenuItem onSelect={() => run(() => setMemberRoleAction(communityId, member.id, "admin"))}>
            <ShieldCheck className="size-4" /> {t("makeAdmin")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => setMemberRoleAction(communityId, member.id, "member"))}>
            <UserRound className="size-4" /> {t("makeMember")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {member.status === "active" ? (
          <DropdownMenuItem variant="destructive" onSelect={() => run(() => setMemberStatusAction(communityId, member.id, "suspended"))}>
            <Ban className="size-4" /> {t("suspend")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => setMemberStatusAction(communityId, member.id, "active"))}>
            <RotateCcw className="size-4" /> {t("reactivate")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
