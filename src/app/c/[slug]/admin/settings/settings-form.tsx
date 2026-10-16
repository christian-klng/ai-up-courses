"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { saveCommunitySettingsAction, type SettingsFormState } from "@/server/actions/community-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidHexColor } from "@/lib/theme";

type Initial = { name: string; tagline: string; defaultLocale: "de" | "en"; primaryColor: string; radius: number; mode: "light" | "dark" | "system" };

/** General settings and branding in one form; the preview follows the inputs before saving. */
export function SettingsForm({ communityId, initial }: { communityId: string; initial: Initial }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(saveCommunitySettingsAction.bind(null, communityId), { status: "idle" });
  const [color, setColor] = useState(initial.primaryColor);
  const [radius, setRadius] = useState(initial.radius);

  useEffect(() => {
    if (state.status === "saved") {
      toast.success(tc("saved"));
      // The root layout carries the theme tokens; refresh renders it with the new ones.
      router.refresh();
    } else if (state.status === "error" && !state.field) {
      toast.error(tc("unexpectedError"));
    }
  }, [state, router, tc]);

  const previewColor = isValidHexColor(color) ? color : initial.primaryColor;

  return (
    <form action={action} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("generalTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" name="name" defaultValue={initial.name} required minLength={2} maxLength={80} aria-invalid={state.status === "error" && state.field === "name"} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tagline">{t("taglineLabel")}</Label>
            <Input id="tagline" name="tagline" defaultValue={initial.tagline} maxLength={160} />
          </div>
          <div className="grid gap-2 sm:max-w-48">
            <Label htmlFor="defaultLocale">{t("localeLabel")}</Label>
            <Select name="defaultLocale" defaultValue={initial.defaultLocale}>
              <SelectTrigger id="defaultLocale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("brandingTitle")}</CardTitle>
          <CardDescription>{t("brandingIntro")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="grid content-start gap-4">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">{t("colorLabel")}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={t("colorLabel")}
                  value={previewColor}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                />
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  value={color}
                  onChange={(e) => setColor(e.target.value.trim())}
                  pattern="#[0-9a-fA-F]{6}"
                  required
                  className="font-mono"
                  aria-invalid={state.status === "error" && state.field === "color"}
                />
              </div>
              {state.status === "error" && state.field === "color" && <p className="text-sm text-destructive">{t("invalidColor")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="radius">
                {t("radiusLabel")} <span className="font-normal text-muted-foreground">({radius.toFixed(2)} rem)</span>
              </Label>
              <input id="radius" name="radius" type="range" min={0} max={1.5} step={0.125} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="accent-primary" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mode">{t("modeLabel")}</Label>
              <Select name="mode" defaultValue={initial.mode}>
                <SelectTrigger id="mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{tc("themeSystem")}</SelectItem>
                  <SelectItem value="light">{tc("themeLight")}</SelectItem>
                  <SelectItem value="dark">{tc("themeDark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid content-start gap-2">
            <span className="text-sm font-medium">{t("preview")}</span>
            {/* Approximation: the saved theme derives light/dark variants from the color (lib/theme.ts). */}
            <div className="rounded-xl border bg-card p-4" style={{ ["--primary" as string]: previewColor, ["--radius" as string]: `${radius}rem` }}>
              <div className="mb-3 h-2 w-2/3 rounded-full bg-muted" />
              <div className="mb-4 h-2 w-1/2 rounded-full bg-muted" />
              <div className="flex gap-2">
                <span className="inline-flex h-9 items-center px-4 text-sm font-medium text-white" style={{ background: previewColor, borderRadius: `${radius}rem` }}>
                  {t("previewButton")}
                </span>
                <span className="inline-flex h-9 items-center border px-4 text-sm font-medium" style={{ borderRadius: `${radius}rem` }}>
                  {t("previewSecondary")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
