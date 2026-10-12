import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity, BarChart3, Bot, ClipboardList, FileBarChart, Menu, PlayCircle, Recycle, Settings, Trophy, Home, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DemoBadge } from "@/components/app/ui-bits";
import { Brand as CampusBrand } from "@/components/app/brand";
import { PrefToggles } from "@/components/app/pref-toggles";
import { usePrefs } from "@/lib/preferences";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

const NAV = [
  { to: "/sensors", label: "Sensor Monitor", key: "nav.sensors", icon: Activity },
  { to: "/dashboard", label: "Dashboard", key: "nav.dashboard", icon: BarChart3 },
  { to: "/tracking", label: "Resource Tracking", key: "nav.tracking", icon: ClipboardList },
  { to: "/waste", label: "Waste Management", key: "nav.waste", icon: Recycle },
  { to: "/assistant", label: "Sustainability Assistant", key: "nav.assistant", icon: Bot },
  { to: "/leaderboard", label: "Leaderboard", key: "nav.leaderboard", icon: Trophy },
  { to: "/reports", label: "Reports", key: "nav.reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", key: "nav.settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = usePrefs();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = path === n.to;
        return (
          <Link key={n.to} to={n.to} onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all hover:translate-x-0.5",
              active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <n.icon className={cn("h-4 w-4", active && "text-sidebar-primary")} />
            {t(n.key)}
          </Link>
        );
      })}
    </nav>
  );
}

const STEPS: { text: string; to: (typeof NAV)[number]["to"] }[] = [
  { text: "Open Sensor Monitor and simulate a heat spike or water leak", to: "/sensors" },
  { text: "View campus metrics and the sustainability score", to: "/dashboard" },
  { text: "Add a new electricity or water reading", to: "/tracking" },
  { text: "Return to the dashboard and see totals update", to: "/dashboard" },
  { text: "Spot the wastage warning (Mechanical electricity spike)", to: "/dashboard" },
  { text: "Generate recommendations and an action plan", to: "/assistant" },
  { text: "Compare departments fairly (per-person)", to: "/leaderboard" },
  { text: "Export a CSV or print the report", to: "/reports" },
];

function DemoGuide() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><PlayCircle className="h-4 w-4" /> 3-min demo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick demo</DialogTitle>
          <DialogDescription>Follow these steps — about three minutes. All data is fictional demo data.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={i}>
              <Link to={s.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-accent">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                {s.text}
              </Link>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function AppLayout() {
  const [open, setOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 flex-col gap-7 bg-sidebar p-4 transition-all duration-300 lg:flex", desktopNavOpen ? "w-60 opacity-100" : "w-0 overflow-hidden border-0 p-0 opacity-0")}>
        <div className="px-2 pt-2"><CampusBrand light /></div>
        <NavList />
        <div className="mt-auto border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground">
          <p className="mt-2 leading-relaxed opacity-80">Software-only demo. Simulated sensors; fictional campus data.</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="glass" className="lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4">
              <SheetHeader className="mb-4 p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><CampusBrand light /></SheetHeader>
              <NavList onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Button size="icon" variant="glass" className="hidden lg:inline-flex" onClick={() => setDesktopNavOpen((v) => !v)} aria-label={desktopNavOpen ? "Hide navigation" : "Show navigation"} title={desktopNavOpen ? "Hide navigation" : "Show navigation"}>{desktopNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
          <Button asChild size="icon" variant="glass" aria-label="Go to dashboard" title="Go to dashboard"><Link to="/dashboard"><Home className="h-5 w-5" /></Link></Button>
          <span className="font-display font-semibold lg:hidden">Green-Grid_SVVV</span>
          <div className="ml-auto flex items-center gap-2">
            <PrefToggles />
            <DemoBadge className="hidden sm:inline-flex" />
            <DemoGuide />
          </div>
        </header>
        <main className="page-content print-full mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
