import { describe, expect, it } from "vitest";
import { autoClimate, binFill, campusWarnings, DEFAULT_ON, simulateCampus } from "./campus-devices";

const isOn = (id: string) => DEFAULT_ON[id] ?? false;

describe("campus device warnings", () => {
  it("flags the canteen dustbin at 4.8 cm from a 60 cm deep bin", () => {
    const w = campusWarnings(simulateCampus(0), isOn).find((x) => x.id === "BIN-CANTEEN");
    expect(w?.title).toBe("Dustbin Almost Full · Spill Risk");
    expect(w?.detail).toBe("Ultrasonic echo measures only 4.8 cm distance to lid (bin depth 60 cm).");
    expect(binFill(4.8, 60)).toBeCloseTo(92, 0);
  });
  it("flags lights left on in empty Classroom 102 and clears when switched off", () => {
    const sim = simulateCampus(0);
    expect(campusWarnings(sim, isOn).some((x) => x.id === "A-102-light")).toBe(true);
    expect(campusWarnings(sim, (id) => id !== "A-102-light" && isOn(id)).some((x) => x.id === "A-102-light")).toBe(false);
  });
  it("flags an unattended running tap with hourly loss", () => {
    const w = campusWarnings(simulateCampus(0), isOn).find((x) => x.id === "TAP-A1");
    expect(w?.severity).toBe("critical");
    expect(w?.where).toContain("Floor 1");
  });
});

describe("smart climate rules", () => {
  it("sets AC 23°C and fan 5 at 34°C or hotter when occupied", () => {
    expect(autoClimate(34.6, true)).toEqual({ acOn: true, setpoint: 23, fanSpeed: 5 });
  });
  it("turns everything off in an empty room", () => {
    expect(autoClimate(35, false)).toEqual({ acOn: false, setpoint: 26, fanSpeed: 0 });
  });
});
