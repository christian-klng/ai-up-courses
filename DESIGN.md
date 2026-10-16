# Design-Vorgaben aus AI-Up

Die Kurs-App übernimmt das **Design-System** von AI-Up (PLAN.md §3.4), nicht dessen Fachkomponenten.
Kopierte Dateien laufen mit der Zeit auseinander; diese Datei hält fest, woher sie stammen, damit das
sichtbar bleibt. Ein gemeinsames Paket lohnt sich erst, wenn beide Apps verbunden sind (§11).

**Quelle:** `christian-klng/ai-up`, Commit `ac40b925536dd1e94811ce7c728b440ae0f97425` (16.10.2026)

| Datei hier | Quelle in AI-Up | Abweichung |
|---|---|---|
| `src/app/globals.css` | `src/app/globals.css` | ohne Hub-Animation der Landingpage und ohne Event-Widget-Regeln |
| `components.json` | `components.json` | – |
| `src/components/ui/*` | `src/components/ui/*` | – (neue Bausteine nur per `npx shadcn add`) |
| `src/lib/theme.ts` | `src/lib/theme.ts` | – (`ThemeSettings` liegt hier in `src/server/db/schema.ts`) |
| `src/lib/brand.ts`, `brand.test.ts` | `src/lib/brand.ts`, `brand.test.ts` | – |
| `src/lib/utils.ts` | `src/lib/utils.ts` | – |
| `src/components/shell/locale-switcher.tsx`, `user-avatar.tsx` | gleichnamig in `src/components/shell/` | – |
| `src/server/mail/mailer.ts` | `src/server/mail/mailer.ts` | – |
| `src/components/shell/app-shell.tsx`, `brand-logo.tsx` | `src/components/shell/` | **nachgebaut**, nicht kopiert: ohne Realtime-Zähler, Größenänderung und Logos |

Schrift: Geist Sans/Mono (`geist/font`). Abhängigkeiten in denselben Hauptversionen wie AI-Up
(`tailwindcss@4`, `tw-animate-css`, `@tailwindcss/typography`, `radix-ui`, `class-variance-authority`,
`tailwind-merge`, `lucide-react`, `next-themes`, `sonner`).

Beim Nachziehen: Diff gegen den genannten Commit bilden, übernehmen und den Commit oben aktualisieren.
