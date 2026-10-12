import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lightbulb, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, RangeSelect } from "@/components/app/ui-bits";
import { newId, setState, useAppState } from "@/lib/store";
import { DEPARTMENTS, DISPOSAL_METHODS, WASTE_CATEGORIES, WASTE_COLORS, fmt } from "@/lib/constants";
import { DAY, recyclingRate, windows } from "@/lib/metrics";
import { generateRecommendations } from "@/lib/recommendations";
import type { DisposalMethod, WasteCategory } from "@/lib/types";

export const Route = createFileRoute("/_app/waste")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Waste Management — Green-Grid_SVVV" },
      { name: "description", content: "Record campus waste by category, track recycling rates and waste trends." },
      { property: "og:title", content: "Waste Management — Green-Grid_SVVV" },
      { property: "og:description", content: "Waste segregation, recycling rate and disposal tracking." },
    ],
  }),
  component: Waste,
});

const DEFAULT_DISPOSAL: Record<WasteCategory, DisposalMethod> = { recyclable: "recycled", organic: "composted", electronic: "e-waste vendor", general: "landfill" };
const schema = z.object({
  department: z.string().min(1, "Choose a department"),
  quantity: z.number({ invalid_type_error: "Enter a number" }).positive("Must be greater than 0").max(100000, "Value looks too large"),
  date: z.string().min(1, "Choose a date"),
});
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Waste() {
  const s = useAppState();
  const [range, setRange] = useState("30");
  const days = Number(range);
  const [form, setForm] = useState({ department: "", category: "recyclable" as WasteCategory, disposal: "recycled" as DisposalMethod, quantity: "", date: new Date().toISOString().slice(0, 10) });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const d = useMemo(() => {
    const { current } = windows(days);
    const inRange = s.waste.filter((w) => { const t = new Date(w.timestamp).getTime(); return t > current.from && t <= current.to; });
    const byCat = WASTE_CATEGORIES.map((c) => ({ name: cap(c), key: c, value: Math.round(inRange.filter((w) => w.category === c).reduce((a, w) => a + w.quantity, 0)) })).filter((x) => x.value > 0);
    const totalKg = inRange.reduce((a, w) => a + w.quantity, 0);
    const rate = recyclingRate(s.waste, current);
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const to = Date.now() - (7 - i) * 7 * DAY, from = to - 7 * DAY;
      const row: Record<string, number | string> = { label: new Date(from + DAY).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) };
      for (const c of WASTE_CATEGORIES) row[c] = Math.round(s.waste.filter((w) => { const t = new Date(w.timestamp).getTime(); return w.category === c && t > from && t <= to; }).reduce((a, w) => a + w.quantity, 0));
      return row;
    });
    const depts = DEPARTMENTS.map((dd) => ({ name: dd.name, rate: recyclingRate(s.waste, current, dd.name) }));
    const recent = [...s.waste].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
    return { byCat, totalKg, rate, weeks, depts, recent, recs: generateRecommendations(s, days, "waste") };
  }, [s, days]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse({ ...form, quantity: form.quantity === "" ? NaN : Number(form.quantity) });
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    const ts = new Date(`${form.date}T12:00:00`);
    if (ts.getTime() > Date.now() + DAY) { toast.error("Date cannot be in the future"); return; }
    setState((st) => ({ ...st, waste: [...st.waste, { id: newId(), category: form.category, quantity: p.data.quantity, unit: "kg", disposal: form.disposal, department: p.data.department, timestamp: ts.toISOString() }] }));
    toast.success(`Recorded ${p.data.quantity} kg of ${form.category} waste`);
    setForm((f) => ({ ...f, quantity: "" }));
  };

  return (
    <div>
      <PageHeader title="Waste Management" description="Segregation, recycling and disposal across departments." actions={<RangeSelect value={range} onChange={setRange} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Record waste">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5"><Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger aria-invalid={!!errors["department"]}><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((x) => <SelectItem key={x.name} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors["department"] && <p className="text-xs text-destructive">{errors["department"]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as WasteCategory, disposal: DEFAULT_DISPOSAL[v as WasteCategory] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WASTE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Disposal</Label>
                <Select value={form.disposal} onValueChange={(v) => setForm({ ...form, disposal: v as DisposalMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DISPOSAL_METHODS.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="wq">Quantity (kg)</Label>
                <Input id="wq" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-invalid={!!errors["quantity"]} />
                {errors["quantity"] && <p className="text-xs text-destructive">{errors["quantity"]}</p>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="wd">Date</Label>
                <Input id="wd" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <Button type="submit" className="w-full">Save waste record</Button>
          </form>
        </Panel>

        <Panel title="Recyclable vs non-recyclable" subtitle={`${fmt(d.totalKg, 1)} kg in last ${days} days`}>
          {d.byCat.length === 0 ? <EmptyState title="No waste recorded in range" /> : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.byCat} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                      {d.byCat.map((x) => <Cell key={x.key} fill={WASTE_COLORS[x.key]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${fmt(v)} kg`} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm"><span>Recycling rate</span><span className="font-display text-xl font-semibold text-primary">{d.rate?.toFixed(1) ?? "—"}%</span></div>
              <Progress value={d.rate ?? 0} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">Recycling rate = recyclable + organic + electronic ÷ total waste × 100.</p>
            </>
          )}
        </Panel>

        <Panel title="Recycling rate by department" subtitle={`Last ${days} days`}>
          <ul className="space-y-3">
            {d.depts.map((x) => (
              <li key={x.name}>
                <div className="flex justify-between text-sm"><span>{x.name}</span><span className="font-medium">{x.rate === null ? "No data" : `${x.rate.toFixed(0)}%`}</span></div>
                <Progress value={x.rate ?? 0} className="mt-1 h-2" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Waste trend by category" subtitle="Last 8 weeks, kg" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                {WASTE_CATEGORIES.map((c) => <Bar key={c} dataKey={c} name={cap(c)} stackId="a" fill={WASTE_COLORS[c]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Reduce waste" subtitle="Rule-based recommendations">
          {d.recs.length === 0 ? <EmptyState title="Recycling is on track" hint="Recycling rate is 70% or higher." /> : d.recs.map((r) => (
            <div key={r.id} className="space-y-2 text-sm">
              <p className="flex gap-2 font-medium"><Lightbulb className="h-4 w-4 text-primary" />{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.finding}</p>
              <ul className="list-disc space-y-1 pl-5 text-xs">{r.steps.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="text-xs"><span className="font-medium">Estimate:</span> {r.estimate}</p>
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="Recent waste records" className="mt-4">
        <ul className="divide-y">
          {d.recent.map((w) => (
            <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: WASTE_COLORS[w.category] }} />
              <span className="flex-1">{fmt(w.quantity, 1)} kg {w.category} · {w.department} · <span className="text-muted-foreground">{w.disposal}</span></span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(w.timestamp).toLocaleDateString("en-IN")}</span>
              <Button size="icon" variant="ghost" aria-label="Delete waste record" onClick={() => { if (window.confirm("Delete this waste record?")) { setState((st) => ({ ...st, waste: st.waste.filter((x) => x.id !== w.id) })); toast.success("Deleted"); } }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
