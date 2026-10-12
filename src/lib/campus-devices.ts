import { useSyncExternalStore } from "react";

/**
 * Simulated campus room/device sensing (software-only, PS-04).
 * Room conditions tick every second; device on/off state comes from the
 * admin-controlled table and is merged in by the caller.
 */
export type DeviceKind = "light" | "fan" | "ac" | "tap";
export type Lang = "en" | "hi";

export interface Room {
  id: string;
  name: string;
  nameHi: string;
  block: string;
  floor: string;
  kind: "lab" | "class" | "office";
  lights: number;
  fans: number;
  hasAc: boolean;
}
export interface Tap { id: string; label: string; labelHi: string; block: string; floor: string }
export interface Bin { id: string; label: string; labelHi: string; block: string; floor: string; depthCm: number }

export const ROOMS: Room[] = [
  { id: "A-101", name: "Computer Lab 101", nameHi: "कंप्यूटर लैब 101", block: "Block A", floor: "Floor 1", kind: "lab", lights: 12, fans: 6, hasAc: true },
  { id: "A-102", name: "Classroom 102", nameHi: "कक्षा 102", block: "Block A", floor: "Floor 1", kind: "class", lights: 8, fans: 4, hasAc: false },
  { id: "A-201", name: "Electronics Lab 201", nameHi: "इलेक्ट्रॉनिक्स लैब 201", block: "Block A", floor: "Floor 2", kind: "lab", lights: 10, fans: 5, hasAc: true },
  { id: "A-204", name: "Classroom 204", nameHi: "कक्षा 204", block: "Block A", floor: "Floor 2", kind: "class", lights: 8, fans: 4, hasAc: false },
  { id: "B-G03", name: "Mechanical Workshop G-03", nameHi: "मैकेनिकल वर्कशॉप G-03", block: "Block B", floor: "Ground floor", kind: "lab", lights: 14, fans: 8, hasAc: false },
  { id: "B-105", name: "Admin Office 105", nameHi: "प्रशासन कार्यालय 105", block: "Block B", floor: "Floor 1", kind: "office", lights: 6, fans: 3, hasAc: true },
];
export const TAPS: Tap[] = [
  { id: "TAP-A1", label: "Washroom tap · Block A, Floor 1", labelHi: "वॉशरूम नल · ब्लॉक A, मंज़िल 1", block: "Block A", floor: "Floor 1" },
  { id: "TAP-A2", label: "Drinking-water tap · Block A, Floor 2", labelHi: "पेयजल नल · ब्लॉक A, मंज़िल 2", block: "Block A", floor: "Floor 2" },
  { id: "TAP-BG", label: "Workshop wash basin · Block B, Ground floor", labelHi: "वर्कशॉप वॉश बेसिन · ब्लॉक B, भूतल", block: "Block B", floor: "Ground floor" },
];
export const BINS: Bin[] = [
  { id: "BIN-CANTEEN", label: "Canteen dustbin", labelHi: "कैंटीन कूड़ेदान", block: "Block B", floor: "Ground floor", depthCm: 60 },
  { id: "BIN-A1", label: "Corridor dustbin", labelHi: "गलियारा कूड़ेदान", block: "Block A", floor: "Floor 1", depthCm: 60 },
];

/** Default device states before an admin changes anything (seeds visible wastage). */
export const DEFAULT_ON: Record<string, boolean> = {
  "A-101-light": true, "A-101-fan": true, "A-101-ac": true,
  "A-102-light": true, "A-102-fan": true,
  "A-201-light": true, "A-201-fan": false, "A-201-ac": false,
  "A-204-light": false, "A-204-fan": false,
  "B-G03-light": true, "B-G03-fan": true,
  "B-105-light": true, "B-105-fan": true, "B-105-ac": true,
  "TAP-A1": true, "TAP-A2": false, "TAP-BG": false,
};

export const LIMITS = { binFullCm: 10, tapIdleFlow: 0.5, hotRoom: 32 };

export interface RoomReading { id: string; temperature: number; occupied: boolean; people: number }
export interface TapReading { id: string; flow: number; personNearby: boolean }
export interface BinReading { id: string; distanceCm: number }

export function simulateCampus(tick: number) {
  const w = (i: number) => Math.sin(tick / 6 + i) * 0.4;
  const rooms: RoomReading[] = ROOMS.map((r, i) => {
    // Classroom 102 and Lab 101 are empty in the seeded demo; workshop runs hot.
    const occupied = r.id === "A-201" || r.id === "B-G03" || (r.id === "B-105" && tick % 120 < 90);
    const base = r.id === "B-G03" ? 34.6 : 27 + i * 0.6;
    return { id: r.id, occupied, people: occupied ? 8 + ((tick + i * 7) % 20) : 0, temperature: Number((base + w(i)).toFixed(1)) };
  });
  const taps: TapReading[] = TAPS.map((t, i) => ({ id: t.id, flow: Number((5.2 + w(i)).toFixed(2)), personNearby: t.id === "TAP-BG" }));
  const bins: BinReading[] = BINS.map((b) => ({ id: b.id, distanceCm: b.id === "BIN-CANTEEN" ? 4.8 : Number((38 - (tick % 40) * 0.1).toFixed(1)) }));
  return { rooms, taps, bins };
}

/** Rule-based smart climate: AC setpoint and fan speed from sensed temperature. */
export function autoClimate(temperature: number, occupied: boolean) {
  if (!occupied) return { acOn: false, setpoint: 26, fanSpeed: 0 };
  if (temperature >= 34) return { acOn: true, setpoint: 23, fanSpeed: 5 };
  if (temperature >= 30) return { acOn: true, setpoint: 24, fanSpeed: 4 };
  if (temperature >= 27) return { acOn: true, setpoint: 25, fanSpeed: 3 };
  return { acOn: false, setpoint: 26, fanSpeed: 2 };
}

export function binFill(distanceCm: number, depthCm: number) {
  return Math.max(0, Math.min(100, ((depthCm - distanceCm) / depthCm) * 100));
}

export interface CampusWarning {
  id: string;
  deviceId?: string;
  kind: "light" | "fan" | "ac" | "tap" | "bin" | "heat";
  severity: "warning" | "critical";
  title: string;
  detail: string;
  where: string;
}

const T = {
  light: { en: "Lights on in an empty room", hi: "खाली कमरे में लाइट चालू" },
  fan: { en: "Fans running in an empty room", hi: "खाली कमरे में पंखे चालू" },
  ac: { en: "AC running in an empty room", hi: "खाली कमरे में AC चालू" },
  tap: { en: "Water tap running unattended", hi: "नल बिना किसी के चालू है" },
  bin: { en: "Dustbin Almost Full · Spill Risk", hi: "कूड़ेदान लगभग भरा · गिरने का खतरा" },
  heat: { en: "Excess heat detected", hi: "अधिक गर्मी पाई गई" },
};

export function campusWarnings(
  sim: ReturnType<typeof simulateCampus>,
  isOn: (deviceId: string) => boolean,
  lang: Lang = "en",
): CampusWarning[] {
  const out: CampusWarning[] = [];
  for (const room of ROOMS) {
    const r = sim.rooms.find((x) => x.id === room.id);
    if (!r) continue;
    const where = `${lang === "hi" ? room.nameHi : room.name} · ${room.block}, ${room.floor}`;
    if (!r.occupied) {
      if (isOn(`${room.id}-light`)) out.push({ id: `${room.id}-light`, deviceId: `${room.id}-light`, kind: "light", severity: "warning", title: T.light[lang], where, detail: lang === "hi" ? `${room.lights} लाइटें चालू, 0 लोग मौजूद।` : `${room.lights} lights on, 0 people detected.` });
      if (isOn(`${room.id}-fan`)) out.push({ id: `${room.id}-fan`, deviceId: `${room.id}-fan`, kind: "fan", severity: "warning", title: T.fan[lang], where, detail: lang === "hi" ? `${room.fans} पंखे चालू, कोई उपस्थित नहीं।` : `${room.fans} fans on, nobody present.` });
      if (room.hasAc && isOn(`${room.id}-ac`)) out.push({ id: `${room.id}-ac`, deviceId: `${room.id}-ac`, kind: "ac", severity: "critical", title: T.ac[lang], where, detail: lang === "hi" ? `खाली कमरे में ${r.temperature}°C पर AC चालू।` : `AC cooling an unoccupied room at ${r.temperature}°C.` });
    }
    if (r.temperature > LIMITS.hotRoom) out.push({ id: `${room.id}-heat`, kind: "heat", severity: "warning", title: T.heat[lang], where, detail: lang === "hi" ? `तापमान ${r.temperature}°C (सीमा ${LIMITS.hotRoom}°C)। वेंटिलेशन जाँचें।` : `Temperature ${r.temperature}°C (limit ${LIMITS.hotRoom}°C). Check ventilation.` });
  }
  for (const tap of TAPS) {
    const t = sim.taps.find((x) => x.id === tap.id);
    if (t && isOn(tap.id) && !t.personNearby && t.flow > LIMITS.tapIdleFlow) out.push({ id: tap.id, deviceId: tap.id, kind: "tap", severity: "critical", title: T.tap[lang], where: lang === "hi" ? tap.labelHi : tap.label, detail: lang === "hi" ? `${t.flow} L/मिनट बह रहा है — लगभग ${Math.round(t.flow * 60)} L/घंटा बर्बादी।` : `${t.flow} L/min flowing — about ${Math.round(t.flow * 60)} L/hour wasted.` });
  }
  for (const bin of BINS) {
    const b = sim.bins.find((x) => x.id === bin.id);
    if (b && b.distanceCm <= LIMITS.binFullCm) out.push({ id: bin.id, kind: "bin", severity: "critical", title: T.bin[lang], where: `${lang === "hi" ? bin.labelHi : bin.label} · ${bin.block}, ${bin.floor}`, detail: lang === "hi" ? `अल्ट्रासोनिक इको ढक्कन तक केवल ${b.distanceCm} सेमी दूरी मापता है (कूड़ेदान गहराई ${bin.depthCm} सेमी)।` : `Ultrasonic echo measures only ${b.distanceCm} cm distance to lid (bin depth ${bin.depthCm} cm).` });
  }
  return out;
}

// 1-second live simulation store
let tick = 0;
let snapshot = { tick: 0, at: 0, ...simulateCampus(0) };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function step() {
  tick += 1;
  snapshot = { tick, at: Date.now(), ...simulateCampus(tick) };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) { step(); timer = setInterval(step, 1000); }
  return () => { listeners.delete(l); if (!listeners.size && timer) { clearInterval(timer); timer = undefined; } };
}
const SERVER = { tick: 0, at: 0, ...simulateCampus(0) };
export function useCampusSim() {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
}
