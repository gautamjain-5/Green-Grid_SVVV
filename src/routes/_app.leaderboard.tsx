import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Info, Medal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBadge, PageHeader, Panel } from "@/components/app/ui-bits";
import { useAppState } from "@/lib/store";
import { departmentStats, leaderboard } from "@/lib/metrics";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Department Leaderboard — Green-Grid_SVVV" },
      { name: "description", content: "Fair, per-person comparison of departments on consumption, recycling, improvement and verified actions." },
      { property: "og:title", content: "Department Leaderboard — Green-Grid_SVVV" },
      { property: "og:description", content: "Which campus department is the most sustainable this week?" },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const s = useAppState();
  const [period, setPeriod] = useState("7");
  const rows = useMemo(() => leaderboard(departmentStats(s, Number(period))), [s, period]);

  return (
    <div>
      <PageHeader title="Sustainability Leaderboard" description="Departments compared per person, not by raw totals."
        actions={<><DemoBadge /><Tabs value={period} onValueChange={setPeriod}><TabsList><TabsTrigger value="7">Week</TabsTrigger><TabsTrigger value="30">Month</TabsTrigger></TabsList></Tabs></>} />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {rows.filter((r) => r.score !== null).slice(0, 3).map((r, i) => (
          <div key={r.department} className={`rounded-2xl border p-5 shadow-card ${i === 0 ? "bg-forest-gradient text-forest-foreground" : "bg-card"}`}>
            <Medal className="h-6 w-6" />
            <p className="mt-3 text-sm opacity-80">#{i + 1}</p>
            <p className="font-display text-xl font-semibold">{r.department}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{r.score!.toFixed(0)}<span className="text-sm font-normal opacity-70"> / 100</span></p>
          </div>
        ))}
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Rank</TableHead><TableHead>Department</TableHead><TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">kWh / person</TableHead><TableHead className="text-right">L / person</TableHead>
              <TableHead className="text-right">Recycling</TableHead><TableHead className="text-right">Improvement</TableHead>
              <TableHead className="text-right">Verified actions</TableHead><TableHead className="text-right">Score</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.department}>
                  <TableCell>{r.score === null ? "—" : i + 1}</TableCell>
                  <TableCell className="font-medium">{r.department}</TableCell>
                  <TableCell className="text-right">{r.headcount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.perCapita.electricity.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.perCapita.water.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{r.recycling === null ? "—" : `${r.recycling.toFixed(0)}%`}</TableCell>
                  <TableCell className="text-right">{r.improvement.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{r.verifiedActions}</TableCell>
                  <TableCell className="text-right font-semibold">{r.score === null ? <span className="text-xs font-normal text-muted-foreground">Insufficient data</span> : r.score.toFixed(0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 flex gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />
          Score = 40% efficiency (campus per-person average ÷ department per-person use, per resource) + 25% recycling rate + 20% improvement vs previous period (−20% → 100, +20% → 0) + 15% verified actions (2+ = full). Departments need at least 3 of 4 resources recorded to be ranked, so low reporting is never rewarded.
        </p>
      </Panel>
    </div>
  );
}
