import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Camera, CalendarDays, Home, LineChart, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useAppData } from "@/lib/store";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/journey", label: "My Journey", icon: CalendarDays },
  { to: "/photos", label: "Photo Journal", icon: Camera },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/guide", label: "Product Guide", icon: BookOpen },
  { to: "/profile", label: "Profile & Privacy", icon: UserRound },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const data = useAppData();
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-foreground">FIRST 30</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">skincare companion</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${path === n.to ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        {data?.demo && (
          <div className="bg-accent px-5 py-1.5 text-center text-xs text-accent-foreground">
            Demo mode — fictional sample data, not real customer data. Reset anytime in Profile & Privacy.
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 fade-up" key={path}>
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-xs text-muted-foreground">
        FIRST 30 is an independent prototype and is not affiliated with or endorsed by Be Bodywise. It does not provide medical advice.
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card/95 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${path === n.to ? "text-primary" : "text-muted-foreground"}`}>
            <n.icon className="h-5 w-5" />
            {n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function NeedsProfile() {
  return (
    <div className="card-soft mx-auto max-w-md p-8 text-center">
      <h2 className="text-2xl">Let's set up your journey</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create your profile or explore the demo to use this section.</p>
      <Link to="/" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Get started</Link>
    </div>
  );
}

export function PageTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
      <h1 className="mt-1 text-4xl font-medium text-foreground md:text-5xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
    </div>
  );
}
