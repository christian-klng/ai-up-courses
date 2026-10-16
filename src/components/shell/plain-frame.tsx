import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";
import { BrandLogo } from "./brand-logo";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app";
import { cn } from "@/lib/utils";

/** The frame outside a community: sign-in, join links, the community picker and the operator area. */
export async function PlainFrame({ children, wide, signedIn }: { children: React.ReactNode; wide?: boolean; signedIn?: boolean }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-svh flex flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo name={APP_NAME} size={32} />
          <span className="font-semibold tracking-tight">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher label={t("language")} />
          {signedIn && (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" /> {t("signOut")}
              </Button>
            </form>
          )}
        </div>
      </header>
      <main className={cn("flex-1 flex justify-center px-4 pb-16 pt-6", wide ? "items-start" : "items-start sm:items-center")}>
        <div className={cn("w-full", wide ? "max-w-4xl" : "max-w-md")}>{children}</div>
      </main>
    </div>
  );
}
