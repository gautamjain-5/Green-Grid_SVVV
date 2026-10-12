import { DEPARTMENTS, RESOURCE_META } from "./constants";
import type { AppState, ResourceRecord, ResourceType, WasteRecord } from "./types";

/**
 * DEMO DATA — fictional college, generated deterministically.
 * This is NOT real sensor data. Values are relative to "today" so charts stay current.
 */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Weekly baseline per department
const WEEKLY: Record<string, Record<Exclude<ResourceType, "waste">, number>> = {
  "Computer Science": { electricity: 2600, water: 42000, paper: 5200 },
  Electronics: { electricity: 2100, water: 30000, paper: 3800 },
  Mechanical: { electricity: 2400, water: 36000, paper: 2600 },
  Civil: { electricity: 1200, water: 22000, paper: 3000 },
  Administration: { electricity: 700, water: 9000, paper: 6500 },
};
const WASTE_WEEKLY: Record<string, number> = {
  "Computer Science": 180, Electronics: 140, Mechanical: 210, Civil: 120, Administration: 60,
};

const DAY = 86400000;

export function buildDemoState(now = Date.now()): AppState {
  const r = rng(42);
  const resources: ResourceRecord[] = [];
  const waste: WasteRecord[] = [];
  const today = new Date(now);
  today.setHours(11, 0, 0, 0);
  const base = today.getTime();
  let n = 0;

  for (let w = 11; w >= 0; w--) {
    const trend = 1 + w * 0.012; // campus slowly improving over 12 weeks
    for (const d of DEPARTMENTS) {
      for (const type of ["electricity", "water", "paper"] as const) {
        let weekly = (WEEKLY[d.name]?.[type] ?? 0) * trend;
        // Built-in anomalies for the demo:
        if (w === 0 && d.name === "Mechanical" && type === "electricity") weekly *= 1.45; // idle machines left on
        if (w === 0 && d.name === "Computer Science" && type === "paper") weekly *= 1.3; // exam printing
        if (w <= 1 && d.name === "Civil" && type === "water") weekly *= 1.35; // suspected leak
        for (const off of [1, 4]) {
          const q = (weekly / 2) * (0.93 + r() * 0.14);
          resources.push({
            id: `demo-r-${n++}`,
            type,
            quantity: Math.round(q),
            unit: RESOURCE_META[type].unit,
            building: d.building,
            department: d.name,
            timestamp: new Date(base - (w * 7 + off) * DAY).toISOString(),
            notes: "Demo meter reading",
            createdBy: "Demo data",
          });
        }
      }
      const wq = (WASTE_WEEKLY[d.name] ?? 0) * trend;
      // recycling improves over time
      const recShare = 0.38 + (11 - w) * 0.012;
      const split: [WasteRecord["category"], number, WasteRecord["disposal"]][] = [
        ["recyclable", recShare, "recycled"],
        ["organic", 0.22, "composted"],
        ["general", 1 - recShare - 0.22 - (w % 4 === 0 ? 0.05 : 0), "landfill"],
      ];
      if (w % 4 === 0) split.push(["electronic", 0.05, "e-waste vendor"]);
      for (const [cat, share, disposal] of split) {
        waste.push({
          id: `demo-w-${n++}`,
          category: cat,
          quantity: Math.round(wq * share * (0.92 + r() * 0.16) * 10) / 10,
          unit: "kg",
          disposal,
          department: d.name,
          timestamp: new Date(base - (w * 7 + 2) * DAY).toISOString(),
          createdBy: "Demo data",
        } as WasteRecord);
      }
    }
  }

  const iso = (days: number) => new Date(base - days * DAY).toISOString();
  return {
    resources,
    waste,
    actions: [
      { id: "demo-a1", name: "Lights-off rounds after 6 PM", description: "Student volunteers check classrooms and switch off lights/fans.", status: "verified", estimatedSavings: "≈180 kWh/week (assumed 15 rooms × 1.2 kW × 10 h)", resource: "electricity", department: "Computer Science", createdBy: "Demo data", createdAt: iso(40) },
      { id: "demo-a2", name: "Segregated bins on every floor", description: "Three-bin system: dry recyclable, wet organic, general.", status: "verified", estimatedSavings: "Raise recycling rate by ~10 pts", resource: "waste", department: "Electronics", createdBy: "Demo data", createdAt: iso(55) },
      { id: "demo-a3", name: "Digital assignment submissions", description: "Move lab records and assignments to the LMS.", status: "completed", estimatedSavings: "≈800 sheets/week", resource: "paper", department: "Civil", createdBy: "Demo data", createdAt: iso(30) },
      { id: "demo-a4", name: "Leak audit of hostel washrooms", description: "Plumbing inspection of taps and flush valves.", status: "in_progress", estimatedSavings: "Not yet estimated", resource: "water", department: "Civil", createdBy: "Demo data", createdAt: iso(6) },
      { id: "demo-a5", name: "Auto shut-off timers on lathe bay", description: "Install timers to cut idle machine load.", status: "planned", estimatedSavings: "Not yet estimated", resource: "electricity", department: "Mechanical", createdBy: "Demo data", createdAt: iso(2) },
      { id: "demo-a6", name: "Double-sided default printing", description: "Set office printers to duplex by default.", status: "completed", estimatedSavings: "≈25% of print sheets", resource: "paper", department: "Administration", createdBy: "Demo data", createdAt: iso(20) },
    ],
    targets: [
      { id: "t-e", type: "electricity", target: 8500, period: "week", department: "Campus" },
      { id: "t-w", type: "water", target: 130000, period: "week", department: "Campus" },
      { id: "t-k", type: "waste", target: 680, period: "week", department: "Campus" },
      { id: "t-p", type: "paper", target: 19000, period: "week", department: "Campus" },
    ],
    profile: {
      fullName: "Demo Coordinator",
      role: "Sustainability Coordinator",
      department: "Administration",
      college: "Greenfield Institute of Technology",
      email: "demo@greenfield.example",
    },
    notifications: { weeklyDigest: true, wastageAlerts: true, targetAlerts: false },
    signedIn: true,
  };
}
