import { describe, expect, it } from "vitest";
import type { HourScore, HourlyWeather } from "../../../src/domain/types";
import { currentForecastHour, findCurrentWindow } from "../../../src/domain/windows";

describe("current forecast hour", () => {
  it("keeps the current hour when it has just started", () => {
    expect(currentForecastHour(new Date("2026-07-28T17:00:00Z")).getUTCHours()).toBe(17);
  });

  it("keeps the current hour once it is underway", () => {
    expect(currentForecastHour(new Date("2026-07-28T17:25:00Z")).getUTCHours()).toBe(17);
  });
});

describe("window selection", () => {
  it("uses the current hour plus the next hour", () => {
    const window = findCurrentWindow(
      [
        scored("2026-07-28T10:00:00Z", 60),
        scored("2026-07-28T11:00:00Z", 80),
        scored("2026-07-28T12:00:00Z", 90),
        scored("2026-07-28T13:00:00Z", 85),
        scored("2026-07-28T14:00:00Z", 50),
      ],
      new Date("2026-07-28T12:30:00Z"),
    );

    expect(window?.start.getUTCHours()).toBe(12);
    expect(window?.end.getUTCHours()).toBe(14);
    expect(window?.hours).toHaveLength(2);
  });

  it("ignores later hours even when they score better", () => {
    const window = findCurrentWindow(
      [
        scored("2026-07-28T14:00:00Z", 50),
        scored("2026-07-28T15:00:00Z", 55),
        scored("2026-07-28T16:00:00Z", 100),
        scored("2026-07-28T17:00:00Z", 100),
      ],
      new Date("2026-07-28T14:25:00Z"),
    );

    expect(window?.start.getUTCHours()).toBe(14);
    expect(window?.averageScore).toBe(53);
  });

  it("returns null when the current and next hours are not consecutive", () => {
    const window = findCurrentWindow(
      [scored("2026-07-28T14:00:00Z", 90), scored("2026-07-28T16:00:00Z", 90)],
      new Date("2026-07-28T14:30:00Z"),
    );

    expect(window).toBeNull();
  });
});

function scored(timestamp: string, score: number): HourScore {
  const hour: HourlyWeather = {
    timestamp: new Date(timestamp),
    temperature: 24,
    apparentTemperature: 24,
    precipitationProbability: 0,
    precipitation: 0,
    weatherCode: 1,
    windSpeed: 10,
    windGusts: 15,
  };

  return {
    hour,
    score,
    rating: score >= 75 ? "GOOD" : score >= 50 ? "MAYBE" : "BAD",
    unsafeWeather: false,
    reasons: [],
  };
}
