import { useSyncExternalStore } from "react";
import { buildDemoState } from "./demo-data";
import type { AppState } from "./types";

/**
 * Demo-mode data store (browser localStorage). No backend is connected,
 * so all data stays in this browser and is clearly labeled as demo data.
 */
const KEY = "ecocampus-demo-v1";
let state: AppState | null = null;
const listeners = new Set<() => void>();

const EMPTY: AppState = {
  resources: [], waste: [], actions: [], targets: [],
  profile: { fullName: "", role: "", department: "", college: "", email: "" },
  notifications: { weeklyDigest: false, wastageAlerts: false, targetAlerts: false },
  signedIn: false,
};

function load(): AppState {
  if (state) return state;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as AppState) : buildDemoState();
  } catch {
    state = buildDemoState();
  }
  return state;
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(load());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  setState(() => buildDemoState());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
