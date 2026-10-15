"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  BookOpenIcon,
  CalendarIcon,
  Sparkles,
  LogOutIcon,
  UserIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { useState } from "react";

const MAIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon, match: (p) => p === "/dashboard" },
  { href: "/courses", label: "Courses", icon: BookOpenIcon, match: (p) => p === "/courses" || p.startsWith("/courses/") },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon, match: (p) => p === "/calendar" },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles, match: (p) => p === "/assistant" },
];

const ACCOUNT_ITEM = { href: "/account", label: "Account", icon: UserIcon, match: (p) => p === "/account" };

const NAV_ITEMS = [...MAIN_NAV_ITEMS, ACCOUNT_ITEM];

export function AppDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/");
  };

  const isFullScreenViewer = /^\/courses\/[^/]+\/materials\/[^/]+$/.test(pathname);

  if (pathname === "/" || pathname === "/login" || isFullScreenViewer) {
    return null;
  }

  const rowClass = (active) =>
    `flex items-center gap-3 rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  const renderLabel = (text) => (
    <span
      className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 ${
        expanded ? "w-32 opacity-100" : "w-0 opacity-0"
      }`}
    >
      {text}
    </span>
  );

  const iconClass = (extra = "") =>
    `h-5 w-5 shrink-0 scale-100 transition-transform duration-200 ${expanded ? "scale-110" : ""} ${extra}`;

  return (
    <>
      {/* Desktop sidebar - static, full viewport height, visible only at md and larger */}
      <nav
        aria-label="Primary navigation"
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background py-4 transition-[width] duration-200 md:flex ${
          expanded ? "w-56" : "w-14"
        }`}
      >
        {/* Top - account, expand/collapse toggle */}
        <div className="flex flex-col gap-2 px-2">
          <Link
            href={ACCOUNT_ITEM.href}
            aria-label={ACCOUNT_ITEM.label}
            aria-current={ACCOUNT_ITEM.match(pathname) ? "page" : undefined}
            className={rowClass(ACCOUNT_ITEM.match(pathname))}
          >
            <ACCOUNT_ITEM.icon className={iconClass()} />
            {renderLabel(ACCOUNT_ITEM.label)}
          </Link>

          <button
            type="button"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            onClick={() => setExpanded((current) => !current)}
            className={rowClass(false)}
          >
            <ChevronsRightIcon className={iconClass(expanded ? "rotate-180" : "")} />
            {renderLabel("Collapse")}
          </button>
        </div>

        {/* Middle - primary nav + log out, vertically centered */}
        <div className="flex flex-1 flex-col items-stretch justify-center">
          <div className="flex flex-col gap-2 px-2">
            {MAIN_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={rowClass(active)}
                >
                  <Icon className={iconClass()} />
                  {renderLabel(label)}
                </Link>
              );
            })}

            <button
              type="button"
              aria-label="Log out"
              onClick={handleLogout}
              className={rowClass(false)}
            >
              <LogOutIcon className={iconClass()} />
              {renderLabel("Log out")}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dock - static bottom bar, visible only below md */}
      <div
        className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-row items-center gap-2 rounded-lg border border-border bg-background p-2 shadow-lg max-w-[calc(100vw-2rem)] md:hidden"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}

        <button
          aria-label="Log out"
          onClick={handleLogout}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LogOutIcon className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
