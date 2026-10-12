import { Droplets, FileText, Trash2, Zap, type LucideIcon } from "lucide-react";
import type { Department, ResourceType, WasteCategory, DisposalMethod } from "./types";

export const COLLEGE_NAME = "Greenfield Institute of Technology (fictional demo college)";

export const DEPARTMENTS: Department[] = [
  { name: "Computer Science", building: "Tech Block A", headcount: 620 },
  { name: "Electronics", building: "Tech Block B", headcount: 480 },
  { name: "Mechanical", building: "Workshop Complex", headcount: 410 },
  { name: "Civil", building: "Main Building", headcount: 300 },
  { name: "Administration", building: "Admin Block", headcount: 140 },
];

export const BUILDINGS = Array.from(new Set(DEPARTMENTS.map((d) => d.building)));

export const RESOURCE_TYPES: ResourceType[] = ["electricity", "water", "waste", "paper"];

export const RESOURCE_META: Record<
  ResourceType,
  { label: string; unit: string; icon: LucideIcon; color: string; tone: string }
> = {
  electricity: { label: "Electricity", unit: "kWh", icon: Zap, color: "var(--electricity)", tone: "text-electricity" },
  water: { label: "Water", unit: "L", icon: Droplets, color: "var(--water)", tone: "text-water" },
  waste: { label: "Waste", unit: "kg", icon: Trash2, color: "var(--waste)", tone: "text-waste" },
  paper: { label: "Paper", unit: "sheets", icon: FileText, color: "var(--paper)", tone: "text-paper" },
};

export const WASTE_CATEGORIES: WasteCategory[] = ["recyclable", "organic", "electronic", "general"];
export const DISPOSAL_METHODS: DisposalMethod[] = ["recycled", "composted", "e-waste vendor", "landfill"];

export const WASTE_COLORS: Record<WasteCategory, string> = {
  recyclable: "var(--chart-1)",
  organic: "var(--chart-3)",
  electronic: "var(--chart-2)",
  general: "var(--chart-4)",
};

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}
