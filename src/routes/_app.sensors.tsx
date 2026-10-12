import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, AlertTriangle, CheckCheck, ChevronRight, Cpu, Droplets, Flame, Pause, Play, Thermometer, Users, Wind, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCENARIOS, SENSOR_LIMITS, sensorHealth, setSensorScenario, toggleSensorStream, useSensors, type SensorScenario } from "@/lib/sensors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sensors")({
  head: () => ({ meta: [
    { title: "Sensor Monitor — Green-Grid_SVVV" },
    { name: "description", content: "Simulated campus temperature, humidity, electricity and water-flow monitoring with actionable sustainability alerts for KAUSHAL 8.0 PS-04." },
    { property: "og:title", content: "Sensor Monitor — Green-Grid_SVVV" },
    { property: "og:description", content: "Detect heat, wasted energy and potential leaks using a transparent software-only sensor demonstration." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Sensors,
});

function Sensors() {
  const { readings, scenario, running, alerts, history } = useSensors();
  const [metric, setMetric] = useState("temperature");
  const [department, setDepartment] = useState("all");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const now = Date.now();
  const online = readings.filter((r) => sensorHealth(r, now) === "online");
  const avg = (key: "temperature" | "humidity") => online.length ? (online.reduce((sum, r) => sum + r[key], 0) / online.length).toFixed(1) : "—";
  const sum = (key: "power" | "flow") => online.length ? online.reduce((total, r) => total + r[key], 0).toFixed(1) : "—";
  const cards = [
    { label: "Campus temperature", value: avg("temperature"), unit: "°C", icon: Thermometer, tone: "text-warning", note: "Alert above 32°C" },
    { label: "Relative humidity", value: avg("humidity"), unit: "%", icon: Wind, tone: "text-water", note: "High humidity above 70%" },
    { label: "Instantaneous power", value: sum("power"), unit: "kW", icon: Zap, tone: "text-electricity", note: "4 monitored rooms" },
    { label: "Water flow", value: sum("flow"), unit: "L/min", icon: Droplets, tone: "text-water", note: "Unoccupied flow limit: 0.5 L/min" },
  ];
  const visible = readings.filter((r) => department === "all" || r.department === department);
  const latest = readings[0];
  return (
    <div className="sensor-page space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"><Activity className="h-4 w-4" />Campus intelligence</p><h1 className="text-3xl font-semibold">Sensor Monitor</h1><p className="mt-2 text-sm text-muted-foreground">Greenfield campus · Environmental conditions & resource use</p></div>
        <div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", running ? "bg-success sensor-pulse" : "bg-warning")} /><span className="text-xs text-muted-foreground">{running ? "Simulated stream · 5s" : "Stream paused"}</span><Button variant="outline" size="icon" onClick={toggleSensorStream} aria-label={running ? "Pause simulation" : "Resume simulation"}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Cpu className="h-5 w-5" /></span><div><p className="text-sm font-medium">Software-only sensor simulation</p><p className="text-xs text-muted-foreground"> No physical sensors connected</p></div></div>
        <Select value={scenario} onValueChange={(v) => { setSensorScenario(v as SensorScenario); setReviewed([]); }}><SelectTrigger className="w-full bg-card sm:w-56" aria-label="Simulation scenario"><SelectValue /></SelectTrigger><SelectContent>{SCENARIOS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <article key={card.label} className="sensor-stat rounded-lg border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{card.label}</span><card.icon className={cn("h-5 w-5", card.tone)} /></div><p className="mt-5 font-display text-4xl font-semibold tabular-nums">{card.value}<span className="ml-1.5 text-base font-normal text-muted-foreground">{card.unit}</span></p><p className="mt-3 text-xs text-muted-foreground">{card.note}</p></article>)}
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.65fr_1fr]">
        <section className="min-w-0"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Environmental trends</h2><p className="text-xs text-muted-foreground">{metric === "temperature" ? "Workshop temperature" : "Combined room power"} · Current scenario · Last 60 samples</p></div><Tabs value={metric} onValueChange={setMetric}><TabsList><TabsTrigger value="temperature"><Thermometer className="mr-1.5 h-3.5 w-3.5" />Heat</TabsTrigger><TabsTrigger value="power"><Zap className="mr-1.5 h-3.5 w-3.5" />Power</TabsTrigger></TabsList></Tabs></div><div className="h-64 rounded-lg border bg-card p-3"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="time" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} minTickGap={35} /><YAxis domain={metric === "temperature" ? [20, 42] : [0, "auto"]} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} width={35} /><Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", borderRadius: 8 }} formatter={(value: number) => [`${value.toFixed(1)} ${metric === "temperature" ? "°C" : "kW"}`, metric === "temperature" ? "Temperature" : "Power"]} />{metric === "temperature" && <ReferenceLine y={SENSOR_LIMITS.temperature} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: "32°C limit", fill: "var(--warning)", fontSize: 10, position: "insideTopLeft" }} />}<Area type="monotone" dataKey={metric} stroke={metric === "temperature" ? "var(--primary)" : "var(--electricity)"} fill={metric === "temperature" ? "var(--primary)" : "var(--electricity)"} fillOpacity={0.1} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div><p className="mt-2 text-xs text-muted-foreground">Updated {latest ? new Date(latest.timestamp).toLocaleTimeString("en-IN") : "—"} · kW is power, not accumulated kWh</p></section>
        <section><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Detected issues</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{alerts.length} active</span></div>{alerts.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center border-y border-border text-center"><CheckCheck className="mb-4 h-9 w-9 text-primary" /><h3 className="font-medium">{online.length ? "Campus conditions look good" : "Waiting for fresh readings"}</h3><p className="mt-2 max-w-64 text-sm text-muted-foreground">{online.length ? "No heat, idle-power or unoccupied-flow alerts in the monitored rooms." : "Stale readings are excluded from alerts."}</p></div> : <div className="space-y-4">{alerts.map((alert) => <article key={alert.id} className={cn("rounded-lg border-l-4 bg-card p-4 shadow-card", alert.severity === "critical" ? "border-l-destructive" : "border-l-warning")}><div className="flex gap-2"><AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", alert.severity === "critical" ? "text-destructive" : "text-warning")} /><h3 className="text-sm font-semibold">{alert.title}</h3></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{alert.detail}</p><p className="mt-3 text-xs leading-relaxed">{alert.action}</p>{alert.resource === "water" && <p className="mt-2 text-xs font-medium text-water">Potential loss: {((readings.find((r) => r.id === alert.sensorId)?.flow ?? 0) * 60).toFixed(0)} L/hour if flow continues</p>}<Button size="sm" variant="ghost" className="mt-2" disabled={reviewed.includes(alert.id)} onClick={() => setReviewed((prev) => [...prev, alert.id])}><CheckCheck className="mr-2 h-4 w-4" />{reviewed.includes(alert.id) ? "Reviewed · issue still active" : "Mark reviewed"}</Button></article>)}</div>}</section>
      </div>

      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Monitored spaces</h2><p className="text-xs text-muted-foreground">{online.length} / 4 reporting · Temperature, humidity, power & flow</p></div><Select value={department} onValueChange={setDepartment}><SelectTrigger className="w-48 bg-card" aria-label="Filter sensor department"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{readings.map((r) => <SelectItem value={r.department} key={r.id}>{r.department}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2">{visible.map((r) => { const issues = alerts.filter((a) => a.sensorId === r.id); const health = sensorHealth(r, now); return <article key={r.id} className="sensor-space rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-2"><div className="flex gap-3"><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", issues.length ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}>{issues.some((a) => a.id.endsWith("heat")) ? <Flame className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}</span><div><h3 className="font-medium">{r.room}</h3><p className="text-xs text-muted-foreground">{r.department} · {r.id}</p></div></div><span className={cn("flex items-center gap-1.5 text-xs", health === "online" ? "text-primary" : "text-warning")}><span className="h-1.5 w-1.5 rounded-full bg-current" />{health}</span></div><dl className="mt-5 grid grid-cols-4 gap-2 border-t pt-4">{[{ label: "Temp", value: `${r.temperature}°C` }, { label: "Humidity", value: `${r.humidity}%` }, { label: "Power", value: `${r.power} kW` }, { label: "Flow", value: `${r.flow} L/m` }].map((v) => <div key={v.label}><dt className="text-[11px] text-muted-foreground">{v.label}</dt><dd className="mt-1 text-xs font-semibold tabular-nums sm:text-sm">{v.value}</dd></div>)}</dl><div className="mt-4 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" />{r.occupied ? "Occupied" : "Unoccupied"}</span><span className={cn("flex items-center gap-1", issues.length ? "text-warning" : "text-primary")}>{issues.length ? `${issues.length} issue detected` : "Within thresholds"}<ChevronRight className="h-3.5 w-3.5" /></span></div></article>; })}</div></section>
      <footer className="border-t pt-4 text-xs text-muted-foreground">Simulated readings and illustrative thresholds, not safety-certified measurements. Recommendations require human review; no automatic equipment control.</footer>
    </div>
  );
}