
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Gauge, Leaf, LineChart, Recycle, Volume2, VolumeX, Menu, X, Home } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/app/ui-bits";
import heroImg from "@/assets/campus-hero.jpg";
import heroImgAlt from "@/assets/campus-hero-alt.webp";
import heroImgThird from "@/assets/campus-hero-third.png";
import { PrefToggles } from "@/components/app/pref-toggles";
import { Brand } from "@/components/app/brand";
import { usePrefs } from "@/lib/preferences";
import { useAppState } from "@/lib/store";
import {
  allEntries,
  recyclingRate,
  series,
  sustainabilityScore,
  windows,
} from "@/lib/metrics";
import { detectAlerts } from "@/lib/recommendations";
import { fmt } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Green-Grid_SVVV — Make Every Campus Resource Count" },
      {
        name: "description",
        content:
          "Smart campus sustainability platform: track electricity, water, waste and paper, find wastage and act on practical recommendations.",
      },
      {
        property: "og:title",
        content: "Green-Grid_SVVV — Make Every Campus Resource Count",
      },
      {
        property: "og:description",
        content:
          "Track campus resources, spot wastage and get practical sustainability recommendations. KAUSHAL 8.0 · PS-04.",
      },
    ],
  }),
  component: Landing,
});

const QUICK_LINKS = [
  { label: "Main / Dashboard", to: "/dashboard" },
  { label: "Sensor Monitor", to: "/sensors" },
  { label: "Resource Tracking", to: "/tracking" },
  { label: "Waste Management", to: "/waste" },
  { label: "Reports", to: "/reports" },
] as const;

const FEATURES = [
  {
    icon: LineChart,
    title: "Resource Tracking",
    text: "Log electricity, water, waste and paper by department and building.",
  },
  {
    icon: Recycle,
    title: "Waste Analytics",
    text: "Categorise waste, follow recycling rates and disposal methods.",
  },
  {
    icon: Bot,
    title: "Smart Recommendations",
    text: "A transparent rule-based engine flags spikes and suggests fixes.",
  },
  {
    icon: Gauge,
    title: "Sustainability Score",
    text: "A documented 0–100 score from resources, recycling and actions.",
  },
];

function Landing() {
  const s = useAppState();
  const { t } = usePrefs();
  const [musicOn, setMusicOn] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const slides = [heroImgAlt, heroImg, heroImgThird];
  useEffect(() => { const id = window.setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), 4500); return () => window.clearInterval(id); }, []);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const toggleMusic = async () => {
    const audio = musicRef.current;
    if (!audio) return;
    if (musicOn) { audio.pause(); setMusicOn(false); return; }
    try { await audio.play(); setMusicOn(true); } catch { setMusicOn(false); }
  };

  const stats = useMemo(() => {
    const e = allEntries(s);

    return {
      score: sustainabilityScore(s, 30).score,
      recycling: recyclingRate(s.waste, windows(30).current),
      alerts: detectAlerts(s, 7).length,
      trend: series(e, "electricity", 12, 7),
    };
  }, [s]);

  return (
    <div className="m-0 min-h-screen w-full bg-background p-0">
      {/* Header */}
      <header className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-2xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="glass" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
          <Brand />
        </div>
        <div className="flex items-center gap-2">
          <PrefToggles />
          <Button asChild variant="glass" size="sm" className="hidden sm:inline-flex"><Link to="/dashboard"><Home className="mr-1 h-4 w-4" />Dashboard</Link></Button>
        </div>
        {menuOpen && <nav className="absolute left-4 top-[calc(100%-4px)] z-40 grid min-w-56 gap-1 rounded-2xl border border-white/30 bg-background/90 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2">
          {QUICK_LINKS.map((item) => <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm transition-colors hover:bg-accent">{item.label}</Link>)}
        </nav>}
      </header>

      {/* Hero Section */}
      <section className="bg-hero w-full">
        <div className="grid w-full items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              {t("hero.tag")}
            </p>

            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              {t("hero.title")}
            </h1>

            <p className="mt-4 max-w-lg text-muted-foreground">
              {t("hero.text")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/sensors">
                  {t("hero.cta2")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline">
                <Link to="/tracking">Start Tracking</Link>
              </Button>
            </div>
          </div>

          <div className="hero-video-shell hero-slideshow shadow-card">
            {slides.map((src, i) => <img key={src} src={src} alt={`SVVV campus slide ${i + 1}`} className={`hero-slide ${i === slideIndex ? "is-active" : ""}`} />)}
            <div className="hero-video-content flex min-h-[360px] flex-col justify-end p-5 text-white sm:p-7">
              <span className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs backdrop-blur-xl"><span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> Campus sustainability · auto slideshow</span>
              <h2 className="max-w-sm text-2xl font-semibold">A smarter, greener SVVV campus.</h2>
              <p className="mt-2 max-w-sm text-sm text-white/80">Campus visuals advance automatically and loop. Sensor values are demo data until hardware is connected.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="glass" size="sm" onClick={toggleMusic}><span className="text-white">{musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</span>{musicOn ? "Pause soft music" : "Play soft music"}</Button>
                <div className="flex items-center gap-1.5" aria-label={`Slide ${slideIndex + 1} of ${slides.length}`}>{slides.map((_, i) => <button key={i} aria-label={`Show slide ${i + 1}`} onClick={() => setSlideIndex(i)} className={`h-2 rounded-full transition-all ${i === slideIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />)}</div>
              </div>
              <audio ref={musicRef} src="/campus-soft-music.mp3" loop preload="auto" onPlay={() => setMusicOn(true)} onPause={() => setMusicOn(false)} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-5 py-14">
        <h2 className="text-2xl font-semibold">What it does</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-5 shadow-card"
            >
              <f.icon className="h-6 w-6 text-primary" />

              <h3 className="mt-3 font-semibold">{f.title}</h3>

              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="w-full px-5 pb-16">
        <div className="rounded-3xl bg-forest-gradient p-6 text-forest-foreground md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Dashboard preview</h2>
            <DemoBadge />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              {
                k: "Sustainability score (30 d)",
                v:
                  stats.score === null
                    ? "—"
                    : Math.round(stats.score).toString(),
              },
              {
                k: "Recycling rate (30 d)",
                v:
                  stats.recycling === null
                    ? "—"
                    : `${stats.recycling.toFixed(0)}%`,
              },
              {
                k: "Wastage alerts this week",
                v: fmt(stats.alerts),
              },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-2xl bg-forest-foreground/10 p-4"
              >
                <p className="text-xs opacity-80">{x.k}</p>
                <p className="mt-1 font-display text-3xl font-semibold">
                  {x.v}
                </p>
              </div>
            ))}

            <div className="rounded-2xl bg-forest-foreground/10 p-4">
              <p className="text-xs opacity-80">
                Electricity, last 12 weeks
              </p>

              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trend}>
                    <XAxis dataKey="label" hide />

                    <Tooltip
                      formatter={(v: number) => `${fmt(v)} kWh`}
                    />

                    <Area
                      dataKey="value"
                      stroke="var(--sidebar-primary)"
                      fill="var(--sidebar-primary)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs opacity-75">
            Figures come from fictional demo data for “Greenfield Institute of
            Technology”, not real sensors.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t">
        <div className="flex w-full flex-col gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>Sustainable Tech Without Limits</span>
        </div>
      </footer>
    </div>
  );
}
