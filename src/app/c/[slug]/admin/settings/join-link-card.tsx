"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { setJoinLinkEnabledAction } from "@/server/actions/community-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type LinkState = { enabled: boolean; url: string; useCount: number };

export function JoinLinkCard({ communityId, initial }: { communityId: string; initial: LinkState | null }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [link, setLink] = useState(initial);
  const [pending, start] = useTransition();

  const toggle = (enabled: boolean) =>
    start(async () => {
      try {
        const res = await setJoinLinkEnabledAction(communityId, enabled);
        setLink({ enabled: res.enabled, url: res.url, useCount: res.useCount });
      } catch {
        toast.error(tc("unexpectedError"));
      }
    });

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    toast.success(tc("copied"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("joinTitle")}</CardTitle>
        <CardDescription>{t("joinIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <Switch id="join-enabled" checked={link?.enabled ?? false} onCheckedChange={toggle} disabled={pending} />
          <Label htmlFor="join-enabled">{t("joinEnabled")}</Label>
        </div>
        {link?.enabled ? (
          <div className="grid gap-2">
            <div className="flex gap-2">
              <Input readOnly value={link.url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label={t("joinTitle")} />
              <Button type="button" variant="outline" onClick={copy}>
                <Copy className="size-4" /> {tc("copy")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("joinUses", { count: link.useCount })}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("joinOff")}</p>
        )}
      </CardContent>
    </Card>
  );
}
