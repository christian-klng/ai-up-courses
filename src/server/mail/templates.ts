import type { Locale } from "@/i18n/config";
import type { Community } from "@/server/db/schema";
import { mailBrandColors } from "@/lib/brand";
import { APP_NAME } from "@/lib/app";
import { escapeHtml, mailButton, mailLayout, neutralBrand, type MailBrand, type MailMessage } from "./mailer";

type Ctx = { appName: string; locale: Locale; brand: MailBrand };

/**
 * Sender context. The subject always names the course app – the mails come from the same address as
 * AI-Up's (PLAN.md §3.5) and must not be mistaken for an AI-Up sign-in.
 */
export function mailContext(community: Pick<Community, "name" | "theme"> | undefined, locale: Locale): Ctx {
  if (!community) return { appName: APP_NAME, locale, brand: neutralBrand(APP_NAME) };
  const appName = `${community.name} · ${APP_NAME}`;
  return { appName, locale, brand: { appName, logoUrl: null, colors: mailBrandColors(community.theme.primaryColor) } };
}

const t = {
  de: {
    magicSubject: (app: string) => `Dein Anmeldelink für ${app}`,
    magicTitle: "Anmelden",
    magicBody: (app: string) => `Klicke auf den Button, um dich bei ${app} anzumelden. Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden.`,
    magicButton: "Jetzt anmelden",
    magicFooter: "Wenn du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.",
    fallback: "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
  },
  en: {
    magicSubject: (app: string) => `Your sign-in link for ${app}`,
    magicTitle: "Sign in",
    magicBody: (app: string) => `Click the button to sign in to ${app}. The link is valid for 15 minutes and can be used once.`,
    magicButton: "Sign in now",
    magicFooter: "If you did not request this sign-in, you can safely ignore this e-mail.",
    fallback: "If the button does not work, copy this link into your browser:",
  },
} satisfies Record<Locale, unknown>;

function linkFallback(locale: Locale, url: string): string {
  return `<p style="font-size:13px;color:#6b7280;">${escapeHtml(t[locale].fallback)}<br><a href="${escapeHtml(url)}" style="color:#6b7280;word-break:break-all;">${escapeHtml(url)}</a></p>`;
}

export function magicLinkMail(ctx: Ctx, to: string, url: string): MailMessage {
  const s = t[ctx.locale];
  return {
    to,
    subject: s.magicSubject(ctx.appName),
    text: `${s.magicBody(ctx.appName)}\n\n${url}\n\n${s.magicFooter}`,
    html: mailLayout({
      brand: ctx.brand,
      title: s.magicTitle,
      bodyHtml: `<p>${escapeHtml(s.magicBody(ctx.appName))}</p>${mailButton(url, s.magicButton, ctx.brand.colors)}${linkFallback(ctx.locale, url)}`,
      footer: s.magicFooter,
    }),
  };
}
