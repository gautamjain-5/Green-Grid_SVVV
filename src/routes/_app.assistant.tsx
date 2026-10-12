import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Calculator, CheckCircle2, ListChecks, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, RangeSelect } from "@/components/app/ui-bits";
import { newId, setState, useAppState } from "@/lib/store";
import { RESOURCE_META, RESOURCE_TYPES } from "@/lib/constants";
import { generateRecommendations, type Recommendation } from "@/lib/recommendations";
import type { ActionStatus, ResourceType } from "@/lib/types";
import { SensorOverview } from "@/components/app/sensor-overview";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sustainability Assistant — Green-Grid_SVVV" },
      { name: "description", content: "Rule-based analysis of campus consumption with transparent savings estimates and an action plan." },
      { property: "og:title", content: "Sustainability Assistant — Green-Grid_SVVV" },
      { property: "og:description", content: "Find unusual consumption and build a sustainability action plan." },
    ],
  }),
  component: Assistant,
});

const SEV = { high: "bg-destructive/10 text-destructive", medium: "bg-warning-soft text-foreground", low: "bg-primary-soft text-primary" };
const STATUS: ActionStatus[] = ["planned", "in_progress", "completed", "verified"];

function Assistant() {
  const s = useAppState();
  const [range, setRange] = useState("7");
  const [focus, setFocus] = useState("all");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      setRecs(generateRecommendations(s, Number(range), focus === "all" ? undefined : (focus as ResourceType)));
      setLoading(false);
    }, 350);
  };

  const addToPlan = (r: Recommendation) => {
    if (s.actions.some((a) => a.name === r.title)) { toast.info("Already in the action plan"); return; }
    setState((st) => ({ ...st, actions: [...st.actions, {
      id: newId(), name: r.title, description: r.steps.join("; "), status: "planned", estimatedSavings: r.estimate,
      resource: r.resource, department: r.department, createdBy: st.profile.fullName || "You", createdAt: new Date().toISOString(),
    }] }));
    toast.success("Added to action plan");
  };

  return (
    <div>
      <PageHeader title="Sustainability Assistant" description="Analyses your recorded data and suggests practical actions."
        actions={<>
          <RangeSelect value={range} onChange={setRange} />
          <Select value={focus} onValueChange={setFocus}>
            <SelectTrigger className="w-[140px] bg-card"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All resources</SelectItem>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{RESOURCE_META[t].label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={run} disabled={loading}><Sparkles className="mr-1 h-4 w-4" />{loading ? "Analysing…" : "Generate recommendations"}</Button>
        </>} />

      <SensorOverview />
      <div className="mb-4 flex items-start gap-3 rounded-lg border bg-card p-4 text-sm shadow-card">
        <Bot className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-muted-foreground"><span className="font-medium text-foreground">Rule-based engine.</span> No external AI service is connected, so this assistant uses transparent rules: it flags any department whose use rose 15%+ vs the previous period, or whose per-person use is 30%+ above the campus average, plus recycling below 70%. Each estimate shows its calculation and assumption.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {recs === null ? (
            <Panel><EmptyState title="Ready to analyse" hint="Pick a period and press “Generate recommendations”." /></Panel>
          ) : recs.length === 0 ? (
            <Panel><EmptyState title="No issues found" hint="No consumption data matched the rules for this period." /></Panel>
          ) : recs.map((r) => {
            const m = RESOURCE_META[r.resource];
            return (
              <Panel key={r.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><m.icon className={`h-5 w-5 ${m.tone}`} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{r.title}</h3><Badge className={SEV[r.severity]} variant="outline">{r.severity} priority</Badge></div>
                    <p className="mt-1 text-sm">{r.finding}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addToPlan(r)}><Plus className="mr-1 h-4 w-4" />Add to plan</Button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What to do</p>
                    <ul className="mt-1 space-y-1 text-sm">{r.steps.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{x}</li>)}</ul></div>
                  <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why it matters</p><p className="mt-1 text-sm text-muted-foreground">{r.why}</p></div>
                </div>
                <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium"><Calculator className="h-4 w-4" />Potential saving: {r.estimate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.calculation}</p>
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel title="Action plan" subtitle={`${s.actions.length} actions`} action={<ListChecks className="h-5 w-5 text-primary" />}>
          {s.actions.length === 0 ? <EmptyState title="No actions yet" /> : (
            <ul className="space-y-3">
              {[...s.actions].reverse().map((a) => (
                <li key={a.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.department} · {a.estimatedSavings}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Select value={a.status} onValueChange={(v) => { setState((st) => ({ ...st, actions: st.actions.map((x) => x.id === a.id ? { ...x, status: v as ActionStatus } : x) })); toast.success("Status updated"); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map((x) => <SelectItem key={x} value={x}>{x.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setState((st) => ({ ...st, actions: st.actions.filter((x) => x.id !== a.id) }))}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Completed and verified actions count toward the sustainability score (20%). Verified actions count on the leaderboard.</p>
        </Panel>
      </div>
    </div>
  );
}
