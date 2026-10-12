import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Database, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/app/ui-bits";
import { resetDemo, setState, useAppState } from "@/lib/store";
import { DEPARTMENTS, RESOURCE_META, fmt } from "@/lib/constants";
import type { NotificationPrefs } from "@/lib/types";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Settings — Green-Grid_SVVV" },
      { name: "description", content: "Profile, college details, resource targets and notification preferences." },
      { property: "og:title", content: "Settings — Green-Grid_SVVV" },
      { property: "og:description", content: "Configure Green-Grid_SVVV for your campus." },
    ],
  }),
  component: Settings,
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(80),
  role: z.string().trim().min(2).max(60),
  email: z.string().trim().email("Invalid email").max(120),
  college: z.string().trim().min(2).max(120),
  department: z.string().min(1),
});

const NOTIFS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "weeklyDigest", label: "Weekly sustainability digest" },
  { key: "wastageAlerts", label: "Unusual consumption alerts" },
  { key: "targetAlerts", label: "Target exceeded alerts" },
];

function Settings() {
  const s = useAppState();
  const nav = useNavigate();
  const [p, setP] = useState(s.profile);
  const [targets, setTargets] = useState(() => Object.fromEntries(s.targets.map((t) => [t.id, String(t.target)])));

  const saveProfile = () => {
    const r = profileSchema.safeParse(p);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Invalid profile"); return; }
    setState((st) => ({ ...st, profile: { ...r.data } }));
    toast.success("Profile saved");
  };
  const saveTargets = () => {
    if (Object.values(targets).some((v) => !(Number(v) > 0))) { toast.error("Targets must be positive numbers"); return; }
    setState((st) => ({ ...st, targets: st.targets.map((t) => ({ ...t, target: Number(targets[t.id]) })) }));
    toast.success("Targets updated — score recalculated");
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile & college">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Role</Label><Input value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Department</Label>
              <Select value={p.department} onValueChange={(v) => setP({ ...p, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label>College</Label><Input value={p.college} onChange={(e) => setP({ ...p, college: e.target.value })} /></div>
          </div>
          <Button className="mt-4" onClick={saveProfile}>Save profile</Button>
          <div className="mt-5 border-t pt-4 text-sm">
            <p className="font-medium">Departments</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">{DEPARTMENTS.map((d) => <li key={d.name}>{d.name} · {d.building} · {d.headcount} people</li>)}</ul>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Weekly resource targets" subtitle="Campus-wide; used by the sustainability score">
            <div className="grid gap-3 sm:grid-cols-2">
              {s.targets.map((t) => (
                <div key={t.id} className="space-y-1.5">
                  <Label>{RESOURCE_META[t.type].label} ({RESOURCE_META[t.type].unit}/week)</Label>
                  <Input type="number" min="1" value={targets[t.id] ?? ""} onChange={(e) => setTargets({ ...targets, [t.id]: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground">Current: {fmt(t.target)}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={saveTargets}>Save targets</Button>
          </Panel>

          <Panel title="Notifications">
            <div className="space-y-3">
              {NOTIFS.map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label htmlFor={n.key}>{n.label}</Label>
                  <Switch id={n.key} checked={s.notifications[n.key]} onCheckedChange={(v) => { setState((st) => ({ ...st, notifications: { ...st.notifications, [n.key]: v } })); toast.success("Preference saved"); }} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">In demo mode these preferences are saved but no emails are sent.</p>
            </div>
          </Panel>

          <Panel title="Data mode">
            <div className="flex items-start gap-3 rounded-xl bg-warning-soft p-3 text-sm">
              <Database className="mt-0.5 h-4 w-4 shrink-0" />
              <p><span className="font-medium">Demo mode is on.</span> No backend is connected; all records are fictional sample data saved only in this browser. Connecting a backend enables real sign-in and shared data.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { if (window.confirm("Reset all demo data to the original sample?")) { resetDemo(); toast.success("Demo data reset"); } }}><RotateCcw className="mr-1 h-4 w-4" />Reset demo data</Button>
              <Button variant="destructive" onClick={() => { setState((st) => ({ ...st, signedIn: false })); toast.success("Signed out of demo session"); nav({ to: "/", replace: true }); }}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
