"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { BookOpen, Check, ChevronsUpDown, LayoutGrid, LogOut, Menu, Monitor, Moon, Settings, Shield, Sun, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "./brand-logo";
import { LocaleSwitcher } from "./locale-switcher";
import { UserAvatar } from "./user-avatar";
import { communityPath } from "@/lib/slug";
import { cn } from "@/lib/utils";

export type ShellCommunity = { slug: string; name: string; tagline: string | null; color: string };

export type AppShellProps = {
  community: ShellCommunity;
  /** every community the account is an active member of, including the current one */
  communities: ShellCommunity[];
  user: { name: string; email: string; isAdmin: boolean; isOperator: boolean };
  labels: {
    courses: string;
    administration: string;
    settings: string;
    members: string;
    communities: string;
    switchCommunity: string;
    operator: string;
    signOut: string;
    menu: string;
    language: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
  };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
};

type NavEntry = { href: string; label: string; icon: LucideIcon; exact?: boolean };

/**
 * App frame inside a community: sidebar with the community, its navigation and the account; on
 * small screens the sidebar moves into a sheet. Modeled on AI-Up's shell (PLAN.md §3.4), without
 * its realtime counters and resizing.
 */
export function AppShell({ community, communities, user, labels, signOutAction, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = communityPath(community.slug);

  const learn: NavEntry[] = [{ href: base, label: labels.courses, icon: BookOpen, exact: true }];
  const admin: NavEntry[] = user.isAdmin
    ? [
        { href: `${base}/admin/settings`, label: labels.settings, icon: Settings },
        { href: `${base}/admin/members`, label: labels.members, icon: Users },
      ]
    : [];

  const isActive = (e: NavEntry) => (e.exact ? pathname === e.href : pathname === e.href || pathname.startsWith(`${e.href}/`));

  const navList = (entries: NavEntry[]) => (
    <ul className="grid gap-0.5">
      {entries.map((e) => (
        <li key={e.href}>
          <Link
            href={e.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(e) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              isActive(e) ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <e.icon className={cn("size-4", isActive(e) && "text-sidebar-primary")} aria-hidden />
            {e.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const sidebar = (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-2">
        <CommunityMenu community={community} communities={communities} labels={labels} />
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {navList(learn)}
        {admin.length > 0 && (
          <>
            <div className="px-2.5 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{labels.administration}</div>
            {navList(admin)}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <UserMenu user={user} labels={labels} signOutAction={signOutAction} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-svh w-full">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 self-start border-r border-sidebar-border md:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={labels.menu}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">{labels.menu}</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <Link href={base} className="flex min-w-0 items-center gap-2">
            <BrandLogo name={community.name} size={28} />
            <span className="truncate font-semibold tracking-tight">{community.name}</span>
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/** Community name at the top of the sidebar; with more than one membership it opens the switcher. */
function CommunityMenu({ community, communities, labels }: Pick<AppShellProps, "community" | "communities" | "labels">) {
  const head = (
    <>
      <BrandLogo name={community.name} size={32} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold">{community.name}</span>
        {community.tagline && <span className="block truncate text-xs text-muted-foreground">{community.tagline}</span>}
      </span>
    </>
  );
  if (communities.length < 2) return <div className="flex items-center gap-2.5 px-1.5 py-1.5">{head}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-sidebar-accent/70" aria-label={labels.switchCommunity}>
          {head}
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{labels.switchCommunity}</DropdownMenuLabel>
        {communities.map((c) => (
          <DropdownMenuItem key={c.slug} asChild>
            {/* A full page load on purpose: the theme comes from the root layout. */}
            <a href={communityPath(c.slug)}>
              <BrandLogo name={c.name} size={20} color={c.color} />
              <span className="flex-1 truncate">{c.name}</span>
              {c.slug === community.slug && <Check className="size-4" aria-hidden />}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load drops the community theme */}
          <a href="/">
            <LayoutGrid className="size-4" aria-hidden /> {labels.communities}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user, labels, signOutAction }: Pick<AppShellProps, "user" | "labels" | "signOutAction">) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent/70">
          <UserAvatar user={{ name: user.name, avatarMediaId: null }} size={28} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 font-normal">
          <span className="text-xs text-muted-foreground">{labels.language}</span>
          <LocaleSwitcher label={labels.language} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{labels.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" aria-hidden /> {labels.themeLight}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" aria-hidden /> {labels.themeDark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" aria-hidden /> {labels.themeSystem}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {user.isOperator && (
          <DropdownMenuItem asChild>
            <a href="/operator">
              <Shield className="size-4" aria-hidden /> {labels.operator}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void signOutAction()}>
          <LogOut className="size-4" aria-hidden /> {labels.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
