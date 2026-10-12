import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBadge, PageHeader, Panel } from "@/components/app/ui-bits";
import { useAppState } from "@/lib/store";
import { RESOURCE_META, RESOURCE_TYPES, fmt } from "@/lib/constants";
import { DAY, allEntries, departmentStats, pctChange, savings, series, sustainabilityScore, total, windows } from "@/lib/metrics";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Reports — Green-Grid_SVVV" },
      { name: "description", content: "Daily, weekly and monthly campus sustainability reports with CSV export and print layout." },
      { property: "og:title", content: "Reports — Green-Grid_SVVV" },
      { property: "og:description", content: "Resource summaries, score trends and department comparisons." },
    ],
  }),
  component: Reports,
});

const CFG = { daily: { n: 14, d: 1, days: 1 }, weekly: { n: 12, d: 7, days: 7 }, monthly: { n: 3, d: 30, days: 30 } } as const;

function Reports() {
  const s = useAppState();
  const [kind, setKind] = useState<keyof typeof CFG>("weekly");
  const cfg = CFG[kind];

  const d = useMemo(() => {
    const e = allEntries(s);
    const per = RESOURCE_TYPES.map((t) => series(e, t, cfg.n, cfg.d));
    const rows = (per[0] ?? []).map((b, i) => {
      const r: Record<string, string | number> = { period: b.label };
      RESOURCE_TYPES.forEach((t, j) => (r[`${t} (${RESOURCE_META[t].unit})`] = per[j]?.[i]?.value ?? 0));
      return r;
    });
    const { current, previous } = windows(cfg.days);
    const summary = RESOURCE_TYPES.map((t) => {
      const c = total(e, t, current), p = total(e, t, previous);
      return { resource: RESOURCE_META[t].label, unit: RESOURCE_META[t].unit, current: Math.round(c), previous: Math.round(p), change_pct: pctChange(c, p)?.toFixed(1) ?? "n/a", saved: savings(p, c)?.toFixed(0) ?? "n/a" };
    });
    const scoreTrend = Array.from({ length: 8 }, (_, i) => {
      const end = Date.now() - (7 - i) * 7 * DAY;
      const sc = sustainabilityScore(s, 7, end).score;
      return { label: new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), score: sc === null ? null : Math.round(sc) };
    });
    const depts = departmentStats(s, cfg.days);
    return { rows: rows.reverse(), summary, scoreTrend, depts };
  }, [s, cfg]);

  const label = kind.charAt(0).toUpperCase() + kind.slice(1);

  return (
    <div>
      <PageHeader title={`${label} Report`} description={`Greenfield Institute of Technology · generated ${new Date().toLocaleString("en-IN")}`}
        actions={<>
          <Tabs value={kind} onValueChange={(v) => setKind(v as keyof typeof CFG)}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>
          <Button variant="outline" onClick={() => { downloadCSV(`ecocampus-${kind}-report.csv`, d.rows); toast.success("Report CSV downloaded"); }}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
          <Button variant="outline" onClick={() => { downloadCSV(`ecocampus-${kind}-summary.csv`, d.summary); toast.success("Summary CSV downloaded"); }}><Download className="mr-1 h-4 w-4" />Summary CSV</Button>
          <Button onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print</Button>
        </>} />
      <DemoBadge className="mb-4" />

      <Panel title="Resource summary" subtitle={`Current ${cfg.days}-day period vs previous ${cfg.days} days`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {d.summary.map((x) => (
            <div key={x.resource} className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">{x.resource}</p>
              <p className="font-display text-xl font-semibold">{fmt(x.current)} {x.unit}</p>
              <p className="text-xs text-muted-foreground">prev {fmt(x.previous)} · change {x.change_pct}{x.change_pct !== "n/a" && "%"} · saved {x.saved}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Sustainability score trend" subtitle="Rolling 7-day score, last 8 weeks">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Department comparison" subtitle={`Last ${cfg.days} days`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Department</TableHead>{RESOURCE_TYPES.map((t) => <TableHead key={t} className="text-right">{RESOURCE_META[t].unit}</TableHead>)}<TableHead className="text-right">Recycling</TableHead></TableRow></TableHeader>
              <TableBody>
                {d.depts.map((x) => (
                  <TableRow key={x.department}>
                    <TableCell className="font-medium">{x.department}</TableCell>
                    {RESOURCE_TYPES.map((t) => <TableCell key={t} className="text-right tabular-nums">{fmt(x.current[t])}</TableCell>)}
                    <TableCell className="text-right">{x.recycling === null ? "—" : `${x.recycling.toFixed(0)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      <Panel title={`${label} consumption`} className="mt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{Object.keys(d.rows[0] ?? {}).map((h) => <TableHead key={h} className={h === "period" ? "" : "text-right"}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {d.rows.map((r) => (
                <TableRow key={String(r["period"])}>
                  {Object.entries(r).map(([k, v]) => <TableCell key={k} className={k === "period" ? "font-medium" : "text-right tabular-nums"}>{typeof v === "number" ? fmt(v) : v}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Savings = previous period − current period. Waste totals include waste-management records. Figures are fictional demo data.</p>
      </Panel>
    </div>
  );
}
