import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { getCommunityBySlug } from "@/server/domain/communities";
import { DEFAULT_THEME } from "@/server/db/schema";
import { themeCss } from "@/lib/theme";
import { APP_NAME, COMMUNITY_SLUG_HEADER } from "@/lib/app";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
};

/**
 * The theme of the community in the path (`/c/<slug>`, handed over by src/proxy.ts). Name and colors
 * are not secret, so this does not check membership – the community layout does that before
 * anything else is shown. Pages outside a community wear the neutral default.
 */
async function brandingTheme() {
  const slug = (await headers()).get(COMMUNITY_SLUG_HEADER);
  const community = slug ? await getCommunityBySlug(slug) : undefined;
  return community?.theme ?? DEFAULT_THEME;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), brandingTheme()]);
  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Brand tokens of the community – tiny inline stylesheet, no rebuild needed. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme={theme.mode} enableSystem disableTransitionOnChange>
          <NextIntlClientProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="top-right" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
