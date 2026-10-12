import { describe, expect, it } from "vitest";
import { pctChange, recyclingRate, resourceComponent, savings, targetAchievement } from "./metrics";
import { toCSV } from "./csv";
import type { WasteRecord } from "./types";

describe("metrics", () => {
  it("percentage change uses previous period as base", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });
  it("percentage change is null without a baseline", () => {
    expect(pctChange(50, 0)).toBeNull();
  });
  it("recycling rate = non-general waste / total", () => {
    const w = (category: WasteRecord["category"], quantity: number) =>
      ({ id: "x", category, quantity, unit: "kg", disposal: "recycled", department: "A", timestamp: new Date().toISOString() }) as WasteRecord;
    expect(recyclingRate([w("recyclable", 30), w("general", 70)])).toBe(30);
    expect(recyclingRate([])).toBeNull();
  });
  it("target achievement is clamped 0..100", () => {
    expect(targetAchievement(100, 80)).toBe(20);
    expect(targetAchievement(100, 150)).toBe(0);
    expect(targetAchievement(100, -50)).toBe(100);
    expect(targetAchievement(0, 10)).toBeNull();
  });
  it("savings require a valid baseline", () => {
    expect(savings(100, 70)).toBe(30);
    expect(savings(0, 70)).toBeNull();
  });
  it("resource component maps ratio 1.0 to 60", () => {
    expect(resourceComponent(100, 100)).toBeCloseTo(60);
    expect(resourceComponent(80, 100)).toBe(100);
    expect(resourceComponent(130, 100)).toBe(0);
  });
  it("csv escapes commas and quotes", () => {
    expect(toCSV([{ a: 'x,"y"', b: 1 }])).toBe('a,b\n"x,""y""",1');
  });
});
