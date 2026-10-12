import { DEPARTMENTS, RESOURCE_META, fmt } from "./constants";
import { allEntries, departmentStats, pctChange, recyclingRate, total, windows } from "./metrics";
import type { AppState, ResourceType } from "./types";

/**
 * Rule-based recommendation engine (no machine learning, no external AI).
 * Every recommendation cites the data and the assumption behind its estimate.
 */
export type Severity = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  severity: Severity;
  resource: ResourceType;
  department: string;
  title: string;
  finding: string;
  why: string;
  steps: string[];
  estimate: string;
  calculation: string;
}

export interface Alert {
  department: string;
  resource: ResourceType;
  change: number;
  current: number;
  previous: number;
}

const PLAYBOOK: Record<ResourceType, { title: string; why: string; steps: string[]; reduction: number; assumption: string }> = {
  electricity: {
    title: "Cut idle electricity load",
    why: "Lights, fans, ACs and machines left on in empty rooms are the most common avoidable electricity use on campuses.",
    steps: ["Switch off lights and fans in unused classrooms and labs", "Schedule end-of-day shutdown checks for machines and AC", "Investigate the building's meter for equipment running overnight"],
    reduction: 0.1,
    assumption: "assumes 10% of current use is idle load that can be eliminated",
  },
  water: {
    title: "Find and fix water losses",
    why: "A single leaking tap can waste thousands of litres a month; sudden rises usually point to leaks or faulty flush valves.",
    steps: ["Fix leaking taps and running flush valves", "Read the meter at night when usage should be near zero", "Monitor water-intensive areas (hostels, canteen, labs)"],
    reduction: 0.12,
    assumption: "assumes 12% of current use is recoverable leakage/overuse",
  },
  paper: {
    title: "Shift to digital-first workflows",
    why: "Printing consumes paper, toner and energy; most assignments and circulars can be shared digitally.",
    steps: ["Encourage digital submissions via the LMS", "Set printers to double-sided by default", "Print circulars only on request"],
    reduction: 0.25,
    assumption: "assumes 25% fewer sheets from duplex + digital submissions",
  },
  waste: {
    title: "Improve segregation and recycling",
    why: "Mixed waste cannot be recycled; segregating at source diverts material from landfill.",
    steps: ["Introduce labelled segregation bins (dry, wet, general)", "Compost canteen and garden organic waste", "Send e-waste to an authorised recycler"],
    reduction: 0.1,
    assumption: "assumes segregation diverts 10% of total waste from landfill",
  },
};

export function detectAlerts(s: AppState, days = 7, threshold = 25, now = Date.now()): Alert[] {
  const { current, previous } = windows(days, now);
  const e = allEntries(s);
  const out: Alert[] = [];
  for (const d of DEPARTMENTS) {
    for (const t of ["electricity", "water", "paper"] as ResourceType[]) {
      const c = total(e, t, current, d.name);
      const p = total(e, t, previous, d.name);
      const ch = pctChange(c, p);
      if (ch !== null && ch >= threshold) out.push({ department: d.name, resource: t, change: ch, current: c, previous: p });
    }
  }
  return out.sort((a, b) => b.change - a.change);
}

export function generateRecommendations(s: AppState, days = 7, focus?: ResourceType, now = Date.now()): Recommendation[] {
  const recs: Recommendation[] = [];
  const alerts = detectAlerts(s, days, 15, now);
  for (const a of alerts) {
    const pb = PLAYBOOK[a.resource];
    const unit = RESOURCE_META[a.resource].unit;
    const excess = a.current - a.previous;
    recs.push({
      id: `alert-${a.department}-${a.resource}`,
      severity: a.change >= 30 ? "high" : "medium",
      resource: a.resource,
      department: a.department,
      title: `${pb.title} — ${a.department}`,
      finding: `${RESOURCE_META[a.resource].label} use rose ${a.change.toFixed(1)}% vs the previous ${days} days (${fmt(a.previous)} → ${fmt(a.current)} ${unit}).`,
      why: pb.why,
      steps: pb.steps,
      estimate: `Up to ${fmt(excess)} ${unit} per ${days} days`,
      calculation: `Returning to the previous-period level: ${fmt(a.current)} − ${fmt(a.previous)} = ${fmt(excess)} ${unit}.`,
    });
  }

  // Per-capita outliers (≥ 30% above campus average)
  const stats = departmentStats(s, days, now);
  for (const t of ["electricity", "water", "paper"] as ResourceType[]) {
    const heads = stats.reduce((a, x) => a + x.headcount, 0);
    const avg = stats.reduce((a, x) => a + x.current[t], 0) / (heads || 1);
    for (const x of stats) {
      if (avg <= 0 || x.perCapita[t] < avg * 1.3) continue;
      if (recs.some((r) => r.department === x.department && r.resource === t)) continue;
      const pb = PLAYBOOK[t];
      const unit = RESOURCE_META[t].unit;
      const save = x.current[t] * pb.reduction;
      recs.push({
        id: `pc-${x.department}-${t}`,
        severity: "medium",
        resource: t,
        department: x.department,
        title: `${pb.title} — ${x.department}`,
        finding: `${x.department} uses ${x.perCapita[t].toFixed(1)} ${unit}/person vs campus average ${avg.toFixed(1)} (${((x.perCapita[t] / avg - 1) * 100).toFixed(0)}% higher).`,
        why: pb.why,
        steps: pb.steps,
        estimate: `≈${fmt(save)} ${unit} per ${days} days`,
        calculation: `${fmt(x.current[t])} ${unit} × ${pb.reduction * 100}% (${pb.assumption}).`,
      });
    }
  }

  // Recycling
  const { current } = windows(days, now);
  const rate = recyclingRate(s.waste, current);
  const wasteTotal = total(allEntries(s), "waste", current);
  if (rate !== null && rate < 70) {
    const pb = PLAYBOOK.waste;
    recs.push({
      id: "waste-rate",
      severity: rate < 50 ? "high" : "low",
      resource: "waste",
      department: "Campus",
      title: pb.title,
      finding: `Campus recycling rate is ${rate.toFixed(1)}% over the last ${days} days (${fmt(wasteTotal, 1)} kg total).`,
      why: pb.why,
      steps: pb.steps,
      estimate: `≈${fmt(wasteTotal * pb.reduction, 1)} kg diverted from landfill per ${days} days`,
      calculation: `${fmt(wasteTotal, 1)} kg × 10% (${pb.assumption}).`,
    });
  }

  // Baseline good-practice recommendation per resource if nothing else flagged
  for (const t of ["electricity", "water", "paper"] as ResourceType[]) {
    if (recs.some((r) => r.resource === t)) continue;
    const pb = PLAYBOOK[t];
    const cur = total(allEntries(s), t, current);
    if (cur <= 0) continue;
    const unit = RESOURCE_META[t].unit;
    recs.push({
      id: `base-${t}`,
      severity: "low",
      resource: t,
      department: "Campus",
      title: pb.title,
      finding: `No unusual ${RESOURCE_META[t].label.toLowerCase()} spikes detected. Campus total: ${fmt(cur)} ${unit} in the last ${days} days.`,
      why: pb.why,
      steps: pb.steps,
      estimate: `≈${fmt(cur * pb.reduction)} ${unit} per ${days} days`,
      calculation: `${fmt(cur)} ${unit} × ${pb.reduction * 100}% (${pb.assumption}).`,
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return recs
    .filter((r) => !focus || r.resource === focus)
    .sort((a, b) => order[a.severity] - order[b.severity]);
}
