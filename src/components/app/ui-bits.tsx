import type { ReactNode } from "react";
import { FlaskConical, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 border-warning/50 bg-warning-soft text-foreground", className)}>
      <FlaskConical className="h-3 w-3" /> Demo data
    </Badge>
  );
}

export function Panel({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border-t border-border py-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

export function RangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ChangePill({ change, invert = false }: { change: number | null; invert?: boolean }) {
  if (change === null) return <span className="text-xs text-muted-foreground">No baseline</span>;
  const bad = invert ? change < 0 : change > 0;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", bad ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary")}>
      {change > 0 ? "+" : ""}{change.toFixed(1)}%
    </span>
  );
}

export function ScoreRing({ score, size = 132 }: { score: number | null; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={12} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary)" strokeWidth={12} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold">{score === null ? "—" : Math.round(score)}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}
