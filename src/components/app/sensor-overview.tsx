import { Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, Thermometer, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSensors } from "@/lib/sensors";

export function SensorOverview() {
  const { readings, alerts, running } = useSensors();
  const average = readings.length ? readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length : null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-border bg-primary-soft/40 px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-primary" />Sensor network <span className="text-xs font-normal text-muted-foreground">Simulated · {running ? "running" : "paused"}</span></div>
      <span className="flex items-center gap-2 text-sm"><Thermometer className="h-4 w-4 text-warning" />{average?.toFixed(1) ?? "—"}°C avg.</span>
      <span className="flex items-center gap-2 text-sm"><Waves className="h-4 w-4 text-water" />{alerts.length} active alerts</span>
      <Button asChild size="sm" variant="ghost" className="sm:ml-auto"><Link to="/sensors">Monitor sensors<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
    </div>
  );
}