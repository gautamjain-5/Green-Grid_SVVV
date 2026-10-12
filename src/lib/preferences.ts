import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "./campus-devices";

export type Theme = "light" | "dark";
interface Prefs { theme: Theme; lang: Lang }
const KEY = "ecocampus-prefs-v1";
const DEFAULT: Prefs = { theme: "light", lang: "en" };
let prefs: Prefs | null = null;
const listeners = new Set<() => void>();

function load(): Prefs {
  if (prefs) return prefs;
  if (typeof window === "undefined") return DEFAULT;
  try { prefs = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { prefs = DEFAULT; }
  return prefs!;
}
function save(next: Prefs) {
  prefs = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyTheme();
  listeners.forEach((l) => l());
}
export function applyTheme() {
  if (typeof document === "undefined") return;
  const p = load();
  document.documentElement.classList.toggle("dark", p.theme === "dark");
  document.documentElement.lang = p.lang;
}
export function toggleTheme() { const p = load(); save({ ...p, theme: p.theme === "dark" ? "light" : "dark" }); }
export function toggleLang() { const p = load(); save({ ...p, lang: p.lang === "en" ? "hi" : "en" }); }

const DICT = {
  "nav.controls": ["Campus Control", "कैंपस नियंत्रण"],
  "nav.leaderboard": ["Leaderboard", "लीडरबोर्ड"],
  "nav.reports": ["Reports", "रिपोर्ट"],
  "nav.settings": ["Settings", "सेटिंग्स"],
  "nav.sensors": ["Sensor Monitor", "सेंसर मॉनिटर"],
  "nav.dashboard": ["Dashboard", "डैशबोर्ड"],
  "nav.tracking": ["Resource Tracking", "संसाधन ट्रैकिंग"],
  "nav.waste": ["Waste Management", "कचरा प्रबंधन"],
  "nav.assistant": ["Sustainability Assistant", "सस्टेनेबिलिटी सहायक"],
  "signout": ["Sign out", "साइन आउट"],
  "admin.signin": ["Admin sign in", "एडमिन साइन इन"],
  "hero.tag": ["Shri Vaishnav Vidyapeeth Vishwavidyalaya · Smart Campus", "श्री वैष्णव विद्यापीठ विश्वविद्यालय · स्मार्ट कैंपस"],
  "hero.title": ["Make Every Campus Resource Count.", "कैंपस के हर संसाधन का सही उपयोग।"],
  "hero.text": ["Live sensing finds lights left on in empty labs, taps running on every floor and overflowing bins — and lets the admin switch them off in one tap.", "लाइव सेंसिंग खाली लैब में जलती लाइटें, हर मंज़िल पर चलते नल और भरे कूड़ेदान खोजती है — और एडमिन एक टैप में उन्हें बंद कर सकता है।"],
  "hero.cta": ["Open Campus Control", "कैंपस नियंत्रण खोलें"],
  "hero.cta2": ["Sensor Monitor", "सेंसर मॉनिटर"],
  "live": ["Live · simulated sensors", "लाइव · सिम्युलेटेड सेंसर"],
  "warnings": ["Warnings", "चेतावनियाँ"],
  "warnings.none": ["No active warnings. Campus is running efficiently.", "कोई सक्रिय चेतावनी नहीं। कैंपस कुशलता से चल रहा है।"],
  "turnoff": ["Turn off", "बंद करें"],
  "controls.title": ["Campus Control", "कैंपस नियंत्रण"],
  "controls.desc": ["Where lights, fans, AC and taps are on right now — switch them from here.", "अभी कहाँ लाइट, पंखे, AC और नल चालू हैं — यहीं से बदलें।"],
  "excel": ["Download Excel", "एक्सेल डाउनलोड करें"],
  "occupied": ["Occupied", "उपस्थित"],
  "empty": ["Empty", "खाली"],
  "lights": ["Lights", "लाइट"],
  "fans": ["Fans", "पंखे"],
  "ac": ["AC", "AC"],
  "taps": ["Water taps by floor", "मंज़िल अनुसार नल"],
  "bins": ["Smart dustbins", "स्मार्ट कूड़ेदान"],
  "auto": ["Smart auto", "स्मार्ट ऑटो"],
  "log": ["Recent admin actions", "हाल की एडमिन क्रियाएँ"],
} as const;
export type DictKey = keyof typeof DICT;

export function usePrefs() {
  const p = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, load, () => DEFAULT);
  useEffect(() => { applyTheme(); }, [p.theme, p.lang]);
  const t = (k: DictKey) => DICT[k][p.lang === "hi" ? 1 : 0];
  return { ...p, t };
}
