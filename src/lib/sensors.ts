import { useSyncExternalStore } from "react";

export type SensorScenario = "normal" | "heat" | "leak" | "idle";
export interface SensorReading {
  id: string;
  room: string;
  department: string;
  temperature: number;
  humidity: number;
  power: number;
  flow: number;
  occupied: boolean;
  timestamp: number;
}
export interface SensorAlert {
  id: string;
  sensorId: string;
  title: string;
  detail: string;
  action: string;
  resource: "electricity" | "water";
  severity: "warning" | "critical";
}
export const SENSOR_LIMITS = { temperature: 32, humidity: 70, idlePower: 2, idleFlow: 0.5, staleSeconds: 30 };
export const SCENARIOS: { value: SensorScenario; label: string }[] = [
  { value: "normal", label: "Normal campus" },
  { value: "heat", label: "Heat spike" },
  { value: "leak", label: "Water leak" },
  { value: "idle", label: "Empty room · power on" },
];
const ROOMS = [
  { id: "ENV-01", room: "Computer lab", department: "Computer Science" },
  { id: "ENV-02", room: "Electronics lab", department: "Electronics" },
  { id: "ENV-03", room: "Workshop", department: "Mechanical" },
  { id: "ENV-04", room: "Admin office", department: "Administration" },
];

export function simulateReadings(scenario: SensorScenario, now: number, tick = 0): SensorReading[] {
  return ROOMS.map((room, i) => {
    const wave = Math.sin(tick / 3 + i) * 0.3;
    const affected = i === 2;
    return {
      ...room,
      temperature: Number(((affected && scenario === "heat" ? 37.8 : 25.2 + i * 0.8) + wave).toFixed(1)),
      humidity: Number(((affected && scenario === "heat" ? 76 : 48 + i * 3) + wave).toFixed(1)),
      power: Number(((affected && scenario === "idle" ? 8.4 : 3.2 + i * 0.7) + wave).toFixed(2)),
      flow: affected && scenario === "leak" ? Number((4.8 + wave).toFixed(2)) : 0,
      occupied: !(affected && (scenario === "idle" || scenario === "leak")),
      timestamp: now,
    };
  });
}

export function sensorHealth(reading: SensorReading, now: number): "online" | "stale" | "invalid" {
  if (![reading.temperature, reading.humidity, reading.power, reading.flow, reading.timestamp].every(Number.isFinite)
    || reading.humidity < 0 || reading.humidity > 100 || reading.power < 0 || reading.flow < 0 || reading.timestamp > now) return "invalid";
  return now - reading.timestamp > SENSOR_LIMITS.staleSeconds * 1000 ? "stale" : "online";
}

export function evaluateSensors(readings: SensorReading[], now: number): SensorAlert[] {
  return readings.flatMap((r) => {
    if (sensorHealth(r, now) !== "online") return [];
    const alerts: SensorAlert[] = [];
    if (r.temperature > SENSOR_LIMITS.temperature) alerts.push({ id: `${r.id}-heat`, sensorId: r.id, title: "Excess heat detected", detail: `${r.room} is ${r.temperature}°C${r.humidity > SENSOR_LIMITS.humidity ? " with high humidity" : ""}. Inspect ventilation and cooling demand.`, action: "Inspect ventilation, shade heat-exposed windows and review cooling settings before increasing AC use.", resource: "electricity", severity: "warning" });
    if (!r.occupied && r.power > SENSOR_LIMITS.idlePower) alerts.push({ id: `${r.id}-idle`, sensorId: r.id, title: "Energy use in an empty room", detail: `${r.room} draws ${r.power} kW with no occupancy.`, action: "Inspect the room and switch off unnecessary lights, AC and equipment; keep essential loads running.", resource: "electricity", severity: "warning" });
    if (!r.occupied && r.flow > SENSOR_LIMITS.idleFlow) alerts.push({ id: `${r.id}-leak`, sensorId: r.id, title: "Possible water leak", detail: `${r.room} has ${r.flow} L/min flow with no occupancy. Confirm that no legitimate water use is scheduled.`, action: "Inspect taps and pipes, confirm unexpected flow, and ask maintenance to isolate and repair the leak.", resource: "water", severity: "critical" });
    return alerts;
  });
}

interface SensorState {
  scenario: SensorScenario;
  running: boolean;
  tick: number;
  readings: SensorReading[];
  history: { time: string; temperature: number; power: number }[];
}
const INITIAL: SensorState = { scenario: "normal", running: true, tick: 0, readings: [], history: [] };
let state = INITIAL;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function publish() { listeners.forEach((listener) => listener()); }
function sample() {
  const now = Date.now();
  const readings = simulateReadings(state.scenario, now, state.tick);
  const workshop = readings.find((r) => r.id === "ENV-03");
  state = { ...state, tick: state.tick + 1, readings, history: [...state.history, { time: new Date(now).toLocaleTimeString("en-IN", { hour12: false }), temperature: workshop?.temperature ?? 0, power: readings.reduce((sum, r) => sum + r.power, 0) }].slice(-60) };
  publish();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.readings.length) sample();
  if (!timer) timer = setInterval(() => { if (state.running) sample(); else { state = { ...state }; publish(); } }, 5000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
  };
}
export function setSensorScenario(scenario: SensorScenario) {
  state = { ...state, scenario, history: [], tick: 0 };
  sample();
}
export function toggleSensorStream() {
  state = { ...state, running: !state.running };
  if (state.running) sample(); else publish();
}
export function useSensors() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  return { ...snapshot, alerts: evaluateSensors(snapshot.readings, Date.now()) };
}