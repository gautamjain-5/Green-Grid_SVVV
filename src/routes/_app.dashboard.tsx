import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Info, PiggyBank } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangePill, EmptyState, PageHeader, Panel, RangeSelect, ScoreRing } from "@/components/app/ui-bits";
import { useAppState } from "@/lib/store";
import { DEPARTMENTS, RESOURCE_META, RESOURCE_TYPES, fmt } from "@/lib/constants";
import { allEntries, departmentStats, pctChange, savings, series, sustainabilityScore, total, windows, SCORE_WEIGHTS } from "@/lib/metrics";
import { detectAlerts, generateRecommendations } from "@/lib/recommendations";
import type { ResourceType } from "@/lib/types";
import { SensorOverview } from "@/components/app/sensor-overview";
import { WarningsPanel } from "@/components/app/warnings-panel";
import { campusWarnings, DEFAULT_ON, useCampusSim } from "@/lib/campus-devices";
import { usePrefs } from "@/lib/preferences";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — Green-Grid_SVVV" },
      { name: "description", content: "Campus electricity, water, waste and paper metrics with sustainability score and wastage alerts." },
      { property: "og:title", content: "Dashboard — Green-Grid_SVVV" },
      { property: "og:description", content: "Live campus sustainability metrics, trends and alerts." },
    ],
  }),
  component: Dashboard,
});

const DEPT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const s = useAppState();
  const campusSim = useCampusSim();
  const { lang } = usePrefs();
  const campusWarningItems = campusWarnings(campusSim, (id) => DEFAULT_ON[id] ?? false, lang);
  const [range, setRange] = useState("7");
  const [res, setRes] = useState<ResourceType>("electricity");
  const [gran, setGran] = useState("daily");
  const days = Number(range);

  const d = useMemo(() => {
    const e = allEntries(s);
    const { current, previous } = windows(days);
    const cards = RESOURCE_TYPES.map((t) => {
      const cur = total(e, t, current);
      const prev = total(e, t, previous);
      return { t, cur, prev, change: pctChange(cur, prev), saved: savings(prev, cur) };
    });
    const stats = departmentStats(s, days);
    const trend = gran === "daily" ? series(e, res, days, 1) : gran === "weekly" ? series(e, res, 12, 7) : series(e, res, 3, 30);
    const dist = stats.map((x) => ({ name: x.department, value: Math.round(x.current[res]) })).filter((x) => x.value > 0);
    const wasting = stats
      .map((x) => {
        const changes = (["electricity", "water", "paper"] as ResourceType[])
          .map((t) => ({ t, ch: pctChange(x.current[t], x.previous[t]) }))
          .filter((c) => c.ch !== null) as { t: ResourceType; ch: number }[];
        const worst = changes.sort((a, b) => b.ch - a.ch)[0];
        return { dept: x.department, worst };
      })
      .filter((x): x is { dept: string; worst: { t: ResourceType; ch: number } } => !!x.worst && x.worst.ch > 0)
      .sort((a, b) => b.worst.ch - a.worst.ch)
      .slice(0, 4);
    const activity = [...s.resources].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);
    return {
      cards, trend, dist, wasting, activity,
      score: sustainabilityScore(s, days),
      alerts: detectAlerts(s, days),
      recs: generateRecommendations(s, days).slice(0, 3),
    };
  }, [s, days, res, gran]);

  return (
    <div>
      <PageHeader title="Campus Dashboard" description={`Greenfield Institute of Technology · ${RESOURCE_META[res].label} focus`}
        actions={<><RangeSelect value={range} onChange={setRange} /><Button asChild><Link to="/tracking">Add record</Link></Button></>} />
      <SensorOverview />
      <div className="mb-5 rounded-2xl border bg-card/70 p-4 shadow-card backdrop-blur-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-sm font-semibold">Campus device warnings</p><p className="text-xs text-muted-foreground">Simulated sensor stream · updates every second</p></div>
          <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">{campusWarningItems.length} active</span>
        </div>
        <WarningsPanel warnings={campusWarningItems} />
      </div>

      {d.alerts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-warning/50 bg-warning-soft p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Wastage warning: {d.alerts.length} unusual spike{d.alerts.length > 1 ? "s" : ""}</p>
            <p className="text-muted-foreground">
              {d.alerts.slice(0, 3).map((a) => `${a.department} ${RESOURCE_META[a.resource].label.toLowerCase()} +${a.change.toFixed(0)}%`).join(" · ")}
            </p>
          </div>
          <Button asChild size="sm" variant="outline"><Link to="/assistant">Get recommendations</Link></Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {d.cards.map((c) => {
          const m = RESOURCE_META[c.t];
          const up = c.change !== null && c.change > 0;
          return (
            <button key={c.t} onClick={() => setRes(c.t)}
              className={`rounded-2xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 ${res === c.t ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><m.icon className={`h-5 w-5 ${m.tone}`} /></span>
                <span className={`h-2.5 w-2.5 rounded-full ${c.change === null ? "bg-muted-foreground" : up ? "bg-destructive" : "bg-success"}`} title={up ? "Rising" : "Stable or falling"} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{m.label}</p>
              <p className="font-display text-2xl font-semibold">{fmt(c.cur)} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span></p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ChangePill change={c.change} /> vs {fmt(c.prev)} prev.
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Sustainability score" subtitle={`Last ${days} days`}>
          <div className="flex items-center gap-5">
            <ScoreRing score={d.score.score} />
            <dl className="space-y-1.5 text-sm">
              <div><dt className="inline text-muted-foreground">Resources ({SCORE_WEIGHTS.resources * 100}%): </dt><dd className="inline font-medium">{d.score.resources?.toFixed(0) ?? "—"}</dd></div>
              <div><dt className="inline text-muted-foreground">Recycling ({SCORE_WEIGHTS.recycling * 100}%): </dt><dd className="inline font-medium">{d.score.recycling?.toFixed(0) ?? "—"}</dd></div>
              <div><dt className="inline text-muted-foreground">Actions ({SCORE_WEIGHTS.actions * 100}%): </dt><dd className="inline font-medium">{d.score.actions?.toFixed(0) ?? "—"}</dd></div>
            </dl>
          </div>
          <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 shrink-0" />Resource part compares use with weekly targets scaled to the period (80% of target = 100, at target = 60, 130% = 0). Recycling = non-general waste share. Actions = share completed or verified.</p>
        </Panel>

        <Panel title="Estimated savings" subtitle="Previous period used as baseline" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-4">
            {d.cards.map((c) => (
              <div key={c.t} className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">{RESOURCE_META[c.t].label}</p>
                <p className={`font-display text-lg font-semibold ${c.saved !== null && c.saved < 0 ? "text-destructive" : "text-primary"}`}>
                  {c.saved === null ? "No baseline" : `${c.saved >= 0 ? "" : "−"}${fmt(Math.abs(c.saved))} ${RESOURCE_META[c.t].unit}`}
                </p>
                <p className="text-[11px] text-muted-foreground">{c.saved === null ? "" : c.saved >= 0 ? "saved" : "over baseline"}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground"><PiggyBank className="h-3.5 w-3.5 shrink-0" />Savings = previous {days}-day total − current {days}-day total. Measured quantities only; no carbon figures are claimed.</p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={`${RESOURCE_META[res].label} consumption`} subtitle={`${RESOURCE_META[res].unit} · click a card above to switch resource`} className="lg:col-span-2"
          action={<Tabs value={gran} onValueChange={setGran}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={60} />
                <Tooltip formatter={(v: number) => `${fmt(v)} ${RESOURCE_META[res].unit}`} />
                <Bar dataKey="value" fill={RESOURCE_META[res].color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Distribution by department" subtitle={`${RESOURCE_META[res].label}, last ${days} days`}>
          {d.dist.length === 0 ? <EmptyState title="No data in this range" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.dist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {d.dist.map((x) => <Cell key={x.name} fill={DEPT_COLORS[DEPARTMENTS.findIndex((dd) => dd.name === x.name) % 5]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${fmt(v)} ${RESOURCE_META[res].unit}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top resource-wasting departments" subtitle="Largest increase vs previous period">
          {d.wasting.length === 0 ? <EmptyState title="No increases detected" /> : (
            <ul className="space-y-3">
              {d.wasting.map((w, i) => (
                <li key={w.dept} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">{i + 1}</span>
                  <div className="flex-1 text-sm"><p className="font-medium">{w.dept}</p><p className="text-xs text-muted-foreground">{RESOURCE_META[w.worst.t].label}</p></div>
                  <ChangePill change={w.worst.ch} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity">
          {d.activity.length === 0 ? <EmptyState title="No records yet" /> : (
            <ul className="space-y-3">
              {d.activity.map((r) => {
                const m = RESOURCE_META[r.type];
                return (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <m.icon className={`h-4 w-4 ${m.tone}`} />
                    <div className="min-w-0 flex-1"><p className="truncate">{fmt(r.quantity)} {r.unit} · {r.department}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {r.createdBy}</p></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Improvement suggestions" subtitle="Rule-based engine" action={<Button asChild size="sm" variant="ghost"><Link to="/assistant">All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>}>
          <ul className="space-y-3">
            {d.recs.map((r) => (
              <li key={r.id} className="rounded-xl bg-muted p-3 text-sm">
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.estimate}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
