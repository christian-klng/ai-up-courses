"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { createCommunityAction, type CreateCommunityState } from "@/server/actions/operator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";

export function CreateCommunityForm() {
  const t = useTranslations("operator");
  const locale = useLocale();
  const [state, action, pending] = useActionState<CreateCommunityState, FormData>(createCommunityAction, { status: "idle" });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "created") return;
    toast.success(t("created", { name: state.name }));
    formRef.current?.reset();
    // Reset the controlled fields, too – the form only resets the uncontrolled ones.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName("");
    setSlug("");
    setSlugTouched(false);
  }, [state, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("createTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">{t("slugLabel")}</Label>
            <Input
              id="slug"
              name="slug"
              required
              className="font-mono"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
            />
            <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminName">{t("adminNameLabel")}</Label>
            <Input id="adminName" name="adminName" required minLength={2} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminEmail">{t("adminEmailLabel")}</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="primaryColor">{t("colorLabel")}</Label>
            <input id="primaryColor" name="primaryColor" type="color" defaultValue="#2563eb" className="h-9 w-16 cursor-pointer rounded-md border bg-transparent p-1" />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-destructive" role="alert">
              {state.code === "slugTaken" ? t("slugTaken") : t("invalid")}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {t("create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
