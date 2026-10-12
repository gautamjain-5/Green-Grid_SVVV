import { DEPARTMENTS, RESOURCE_TYPES } from "./constants";
import type { AppState, ResourceRecord, ResourceType, WasteRecord } from "./types";

export const DAY = 86400000;

export interface Window { from: number; to: number }

export function windows(days: number, now = Date.now()) {
  return {
    current: { from: now - days * DAY, to: now },
    previous: { from: now - 2 * days * DAY, to: now - days * DAY },
  };
}

const inWin = (ts: string, w: Window) => {
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && t > w.from && t <= w.to;
};

const valid = (q: number) => Number.isFinite(q) && q >= 0;

/** Waste records are also counted as "waste" resource consumption (kg). */
export function allEntries(s: Pick<AppState, "resources" | "waste">): ResourceRecord[] {
  const fromWaste: ResourceRecord[] = s.waste.map((w) => ({
    id: w.id, type: "waste", quantity: w.quantity, unit: "kg", building: "",
    department: w.department, timestamp: w.timestamp, createdBy: "", notes: w.category,
  }));
  return [...s.resources.filter((r) => valid(r.quantity)), ...fromWaste.filter((r) => valid(r.quantity))];
}

export function total(entries: ResourceRecord[], type: ResourceType, w: Window, department?: string) {
  let sum = 0;
  for (const e of entries) {
    if (e.type !== type || !inWin(e.timestamp, w)) continue;
    if (department && e.department !== department) continue;
    sum += e.quantity;
  }
  return sum;
}

/** (current - previous) / previous × 100; null when no valid baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Recyclable = every category except "general" (recyclable, organic/compostable, electronic). */
export function recyclingRate(waste: WasteRecord[], w?: Window, department?: string): number | null {
  let rec = 0, all = 0;
  for (const x of waste) {
    if (w && !inWin(x.timestamp, w)) continue;
    if (department && x.department !== department) continue;
    if (!valid(x.quantity)) continue;
    all += x.quantity;
    if (x.category !== "general") rec += x.quantity;
  }
  return all > 0 ? (rec / all) * 100 : null;
}

/** max(0, (target - actual)/target × 100), capped at 100. */
export function targetAchievement(target: number, actual: number): number | null {
  if (!(target > 0)) return null;
  return Math.min(100, Math.max(0, ((target - actual) / target) * 100));
}

/** baseline - current, only when a valid baseline exists. */
export function savings(baseline: number, current: number): number | null {
  if (!(baseline > 0)) return null;
  return baseline - current;
}

/**
 * Resource component (0-100) from ratio r = actual / reference.
 * r ≤ 0.8 → 100, r = 1.0 → 60, r ≥ 1.3 → 0 (linear).
 */
export function resourceComponent(actual: number, reference: number): number | null {
  if (!(reference > 0)) return null;
  const r = actual / reference;
  return Math.min(100, Math.max(0, ((1.3 - r) / 0.5) * 100));
}

export const SCORE_WEIGHTS = { resources: 0.5, recycling: 0.3, actions: 0.2 };

export interface ScoreBreakdown {
  score: number | null;
  resources: number | null;
  recycling: number | null;
  actions: number | null;
  perResource: Partial<Record<ResourceType, number | null>>;
}

/**
 * Sustainability score (0-100) =
 *   50% resource component (avg over resources; reference = scaled weekly target, else previous period)
 * + 30% recycling rate
 * + 20% share of sustainability actions completed or verified.
 * Components with no data are dropped and remaining weights re-normalised.
 */
export function sustainabilityScore(s: AppState, days: number, now = Date.now()): ScoreBreakdown {
  const { current, previous } = windows(days, now);
  const entries = allEntries(s);
  const perResource: ScoreBreakdown["perResource"] = {};
  const comps: number[] = [];
  for (const type of RESOURCE_TYPES) {
    const actual = total(entries, type, current);
    const tgt = s.targets.find((t) => t.type === type);
    const ref = tgt ? (tgt.target * days) / 7 : total(entries, type, previous);
    const c = actual > 0 ? resourceComponent(actual, ref) : null;
    perResource[type] = c;
    if (c !== null) comps.push(c);
  }
  const resources = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null;
  const recycling = recyclingRate(s.waste, current);
  const actions = s.actions.length
    ? (s.actions.filter((a) => a.status === "completed" || a.status === "verified").length / s.actions.length) * 100
    : null;
  const parts: [number | null, number][] = [
    [resources, SCORE_WEIGHTS.resources],
    [recycling, SCORE_WEIGHTS.recycling],
    [actions, SCORE_WEIGHTS.actions],
  ];
  const used = parts.filter(([v]) => v !== null) as [number, number][];
  const wsum = used.reduce((a, [, w]) => a + w, 0);
  const score = wsum > 0 ? used.reduce((a, [v, w]) => a + v * w, 0) / wsum : null;
  return { score, resources, recycling, actions, perResource };
}

/** Time-bucketed series for one resource. */
export function series(entries: ResourceRecord[], type: ResourceType, buckets: number, bucketDays: number, now = Date.now()) {
  const out: { label: string; value: number; from: number; to: number }[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const to = now - i * bucketDays * DAY;
    const from = to - bucketDays * DAY;
    const d = new Date(to);
    const label = bucketDays === 1
      ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : bucketDays === 7
        ? `Wk ${new Date(from + DAY).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
        : d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    out.push({ label, value: Math.round(total(entries, type, { from, to })), from, to });
  }
  return out;
}

export interface DeptStat {
  department: string;
  headcount: number;
  current: Record<ResourceType, number>;
  previous: Record<ResourceType, number>;
  perCapita: Record<ResourceType, number>;
  recycling: number | null;
  verifiedActions: number;
  hasData: boolean;
}

export function departmentStats(s: AppState, days: number, now = Date.now()): DeptStat[] {
  const { current, previous } = windows(days, now);
  const entries = allEntries(s);
  return DEPARTMENTS.map((d) => {
    const cur = {} as Record<ResourceType, number>;
    const prev = {} as Record<ResourceType, number>;
    const pc = {} as Record<ResourceType, number>;
    let records = 0;
    for (const t of RESOURCE_TYPES) {
      cur[t] = total(entries, t, current, d.name);
      prev[t] = total(entries, t, previous, d.name);
      pc[t] = d.headcount > 0 ? cur[t] / d.headcount : 0;
      if (cur[t] > 0) records++;
    }
    return {
      department: d.name,
      headcount: d.headcount,
      current: cur,
      previous: prev,
      perCapita: pc,
      recycling: recyclingRate(s.waste, current, d.name),
      verifiedActions: s.actions.filter((a) => a.department === d.name && a.status === "verified").length,
      hasData: records >= 3, // need at least 3 of 4 resources recorded to be ranked
    };
  });
}

/**
 * Leaderboard score (0-100), only for departments with enough data:
 * 40% efficiency: per resource, campus avg per-capita ÷ dept per-capita (capped 0-1.5 → 0-100), averaged
 * 25% recycling rate
 * 20% improvement vs previous period (−20% change → 100, +20% → 0)
 * 15% verified actions (2+ → 100)
 * Per-capita normalisation prevents smaller departments winning just for being small.
 */
export function leaderboard(stats: DeptStat[]) {
  const ranked = stats.filter((s) => s.hasData);
  const avgPc = {} as Record<ResourceType, number>;
  for (const t of RESOURCE_TYPES) {
    const totalQ = ranked.reduce((a, s) => a + s.current[t], 0);
    const heads = ranked.reduce((a, s) => a + (s.current[t] > 0 ? s.headcount : 0), 0);
    avgPc[t] = heads > 0 ? totalQ / heads : 0;
  }
  const rows = stats.map((s) => {
    const eff: number[] = [];
    const imp: number[] = [];
    for (const t of RESOURCE_TYPES) {
      if (s.perCapita[t] > 0 && avgPc[t] > 0) eff.push(Math.min(1.5, avgPc[t] / s.perCapita[t]) / 1.5 * 100);
      const ch = pctChange(s.current[t], s.previous[t]);
      if (ch !== null) imp.push(Math.min(100, Math.max(0, (20 - ch) / 40 * 100)));
    }
    const efficiency = eff.length ? eff.reduce((a, b) => a + b, 0) / eff.length : 0;
    const improvement = imp.length ? imp.reduce((a, b) => a + b, 0) / imp.length : 50;
    const actionsC = Math.min(100, s.verifiedActions * 50);
    const score = s.hasData
      ? 0.4 * efficiency + 0.25 * (s.recycling ?? 0) + 0.2 * improvement + 0.15 * actionsC
      : null;
    return { ...s, efficiency, improvement, score };
  });
  return rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
