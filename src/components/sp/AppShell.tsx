import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/lib/supabase";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "M3 12 12 3l9 9M5 10v10h14V10" },
  { to: "/courses", label: "Courses", icon: "M4 4h16v16H4zM4 9h16M9 4v16" },
  { to: "/session", label: "Study", icon: "M5 3v18l7-4 7 4V3z" },
  {
    to: "/community",
    label: "Community",
    icon: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M17 3.13A4 4 0 0 1 17 11",
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav2 = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [userName, setUserName] = useState("Student");
  const [userInitial, setUserInitial] = useState("S");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name ?? user.email ?? "Student";
        setUserName(name.split(" ")[0]);
        setUserInitial(name[0]?.toUpperCase() ?? "S");
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    nav2({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r border-border bg-sidebar px-3 py-6 overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "w-64" : "w-[68px]"
        }`}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-1 overflow-hidden">
          <div className="shrink-0">
            <Logo />
          </div>
          <span
            className={`font-display text-lg font-semibold whitespace-nowrap transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
          >
            StudyPal
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 overflow-hidden ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={n.icon} />
                </svg>
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
                >
                  {n.label}
                </span>
                {active && expanded && (
                  <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent-foreground/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Theme toggle */}
          <div
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 overflow-hidden transition-all duration-200 ${expanded ? "border border-border" : ""}`}
          >
            <div className="shrink-0">
              <ThemeToggle />
            </div>
            <span
              className={`text-sm text-muted-foreground whitespace-nowrap transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
            >
              Theme
            </span>
          </div>

          {/* User card */}
          <div
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 overflow-hidden transition-all duration-200 ${expanded ? "border border-border bg-background" : ""}`}
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {userInitial}
            </div>
            <div
              className={`flex-1 min-w-0 transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
            >
              <div className="truncate text-sm font-medium whitespace-nowrap">{userName}</div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">Free plan</div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className={`shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-all duration-300 ${expanded ? "opacity-100" : "opacity-0 w-0 pointer-events-none"}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center gap-1 py-3 text-[11px] ${active ? "text-accent" : "text-muted-foreground"}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
