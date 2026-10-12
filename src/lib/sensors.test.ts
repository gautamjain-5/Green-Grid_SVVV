import { describe, expect, it } from "vitest";
import { evaluateSensors, sensorHealth, simulateReadings } from "./sensors";

describe("software-only sensor scenarios", () => {
  const now = 1_800_000_000_000;
  it("provides temperature and humidity readings without a normal-campus alert", () => {
    const readings = simulateReadings("normal", now);
    expect(readings).toHaveLength(4);
    expect(readings[0]?.temperature).toBe(25.2);
    expect(evaluateSensors(readings, now)).toHaveLength(0);
  });
  it("turns excess heat into a cooling and ventilation recommendation", () => {
    const alerts = evaluateSensors(simulateReadings("heat", now), now);
    expect(alerts.map((a) => a.id)).toEqual(["ENV-03-heat"]);
    expect(alerts[0]?.resource).toBe("electricity");
  });
  it("identifies unoccupied water flow and derives hourly loss from the reading", () => {
    const readings = simulateReadings("leak", now, 0);
    const workshop = readings.find((r) => r.id === "ENV-03");
    expect(evaluateSensors(readings, now).some((a) => a.id === "ENV-03-leak")).toBe(true);
    expect((workshop?.flow ?? 0) * 60).toBeCloseTo(304.2, 1);
  });
  it("flags power use in an empty room but not occupied power use", () => {
    const readings = simulateReadings("idle", now);
    expect(evaluateSensors(readings, now).map((a) => a.id)).toEqual(["ENV-03-idle"]);
    expect(evaluateSensors(readings.map((r) => ({ ...r, occupied: true })), now)).toHaveLength(0);
  });
  it("does not infer sustainability alerts from stale or invalid readings", () => {
    const readings = simulateReadings("heat", now);
    expect(sensorHealth({ ...readings[0], id: "test", room: "test", department: "test", temperature: 40, humidity: 76, power: 4, flow: 0, occupied: true, timestamp: now - 31000 }, now)).toBe("stale");
    expect(evaluateSensors(readings, now + 31000)).toHaveLength(0);
    expect(evaluateSensors(readings.map((r) => ({ ...r, temperature: NaN })), now)).toHaveLength(0);
  });
});