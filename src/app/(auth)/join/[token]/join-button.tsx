"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { joinCommunityAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

/** One-click join for a visitor who is already signed in. */
export function JoinButton({ token, community }: { token: string; community: string }) {
  const t = useTranslations("join");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  const join = () =>
    start(async () => {
      const res = await joinCommunityAction(token);
      if (res.ok) {
        toast.success(t("joined", { community }));
        // A full page load: the root layout has to pick up the community's theme.
        window.location.assign(res.href);
        return;
      }
      toast.error(res.reason === "suspended" ? t("suspended") : res.reason === "invalid" ? t("invalidBody") : tc("unexpectedError"));
      if (res.reason === "unauthenticated") router.refresh();
    });

  return (
    <Button size="lg" className="w-full" disabled={pending} onClick={join}>
      {t("joinAs", { community })}
    </Button>
  );
}
