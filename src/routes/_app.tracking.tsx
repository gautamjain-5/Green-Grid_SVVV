import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Download, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel } from "@/components/app/ui-bits";
import { newId, setState, useAppState } from "@/lib/store";
import { DEPARTMENTS, RESOURCE_META, RESOURCE_TYPES, fmt } from "@/lib/constants";
import { downloadCSV } from "@/lib/csv";
import type { ResourceType } from "@/lib/types";
import { SensorOverview } from "@/components/app/sensor-overview";

export const Route = createFileRoute("/_app/tracking")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Resource Tracking — Green-Grid_SVVV" },
      { name: "description", content: "Record and manage electricity, water, waste and paper consumption by department." },
      { property: "og:title", content: "Resource Tracking — Green-Grid_SVVV" },
      { property: "og:description", content: "Log campus resource readings and review records." },
    ],
  }),
  component: Tracking,
});

const schema = z.object({
  type: z.enum(["electricity", "water", "waste", "paper"]),
  department: z.string().min(1, "Choose a department"),
  quantity: z.number({ invalid_type_error: "Enter a number" }).positive("Quantity must be greater than 0").max(10_000_000, "Value looks too large"),
  datetime: z.string().min(1, "Choose date and time").refine((v) => new Date(v).getTime() <= Date.now() + 60000, "Date cannot be in the future"),
  notes: z.string().max(300, "Max 300 characters").optional(),
});

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function Tracking() {
  const s = useAppState();
  const [form, setForm] = useState({ type: "electricity" as ResourceType, department: "", quantity: "", datetime: localNow(), notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [limit, setLimit] = useState(25);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, quantity: form.quantity === "" ? NaN : Number(form.quantity), notes: form.notes || undefined });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    const dept = DEPARTMENTS.find((d) => d.name === parsed.data.department);
    if (!dept) { setErrors({ department: "Choose a valid department" }); return; }
    setState((st) => ({
      ...st,
      resources: [...st.resources, {
        id: newId(), type: parsed.data.type, quantity: parsed.data.quantity, unit: RESOURCE_META[parsed.data.type].unit,
        building: dept.building, department: dept.name, timestamp: new Date(parsed.data.datetime).toISOString(),
        ...(parsed.data.notes ? { notes: parsed.data.notes } : {}), createdBy: st.profile.fullName || "You",
      }],
    }));
    toast.success(`Saved ${fmt(parsed.data.quantity)} ${RESOURCE_META[parsed.data.type].unit} for ${dept.name}`, { description: "Dashboard metrics updated." });
    setForm((f) => ({ ...f, quantity: "", notes: "", datetime: localNow() }));
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...s.resources]
      .filter((r) => (fType === "all" || r.type === fType) && (fDept === "all" || r.department === fDept))
      .filter((r) => !term || `${r.department} ${r.building} ${r.notes ?? ""} ${r.createdBy}`.toLowerCase().includes(term))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [s.resources, q, fType, fDept]);

  const remove = (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    setState((st) => ({ ...st, resources: st.resources.filter((r) => r.id !== id) }));
    toast.success("Record deleted");
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <div>
      <PageHeader title="Resource Tracking" description="Add meter readings and manage records. Saved in demo mode (this browser)." />
      <SensorOverview />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="New record">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label>Resource type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ResourceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{RESOURCE_META[t].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department / building</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger aria-invalid={!!errors["department"]}><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name} — {d.building}</SelectItem>)}</SelectContent>
              </Select>
              {err("department")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <div className="flex items-center gap-2">
                <Input id="qty" type="number" inputMode="decimal" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-invalid={!!errors["quantity"]} placeholder="e.g. 450" />
                <span className="w-16 text-sm text-muted-foreground">{RESOURCE_META[form.type].unit}</span>
              </div>
              {err("quantity")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt">Date and time</Label>
              <Input id="dt" type="datetime-local" value={form.datetime} max={localNow()} onChange={(e) => setForm({ ...form, datetime: e.target.value })} aria-invalid={!!errors["datetime"]} />
              {err("datetime")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" maxLength={300} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Meter #3, lab block" />
              {err("notes")}
            </div>
            <Button type="submit" className="w-full">Save record</Button>
          </form>
        </Panel>

        <Panel title={`Records (${rows.length})`} className="lg:col-span-2"
          action={<Button size="sm" variant="outline" onClick={() => { if (!rows.length) { toast.error("Nothing to export"); return; } downloadCSV("resource-records.csv", rows.map(({ id, ...r }) => r)); toast.success("CSV downloaded"); }}><Download className="mr-1 h-4 w-4" />CSV</Button>}>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search department, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All types</SelectItem>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{RESOURCE_META[t].label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fDept} onValueChange={setFDept}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All departments</SelectItem>{DEPARTMENTS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {rows.length === 0 ? <EmptyState title="No matching records" hint="Change the filters or add a new record." /> : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {rows.slice(0, limit).map((r) => {
                      const m = RESOURCE_META[r.type];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-xs">{new Date(r.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                          <TableCell><span className="flex items-center gap-1.5"><m.icon className={`h-3.5 w-3.5 ${m.tone}`} />{m.label}</span></TableCell>
                          <TableCell className="whitespace-nowrap">{r.department}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.quantity, 1)} {r.unit}</TableCell>
                          <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">{r.notes}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" aria-label="Delete record" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {rows.length > limit && <Button variant="ghost" className="mt-2 w-full" onClick={() => setLimit(limit + 25)}>Show more</Button>}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
