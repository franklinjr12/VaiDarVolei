import { describe, expect, it } from "vitest";
import type { HourScore, HourlyWeather } from "../../../src/domain/types";
import { findBestWindow, nextPlayableHour } from "../../../src/domain/windows";

describe("next playable hour", () => {
  it("keeps the current hour when it has just started", () => {
    expect(nextPlayableHour(new Date("2026-07-28T17:00:00Z")).getUTCHours()).toBe(17);
  });

  it("moves to the next hour once the current hour is underway", () => {
    expect(nextPlayableHour(new Date("2026-07-28T17:25:00Z")).getUTCHours()).toBe(18);
  });
});

describe("window selection", () => {
  it("chooses the highest scoring consecutive window and can extend it", () => {
    const window = findBestWindow(
      [
        scored("2026-07-28T10:00:00Z", 60),
        scored("2026-07-28T11:00:00Z", 80),
        scored("2026-07-28T12:00:00Z", 90),
        scored("2026-07-28T13:00:00Z", 85),
        scored("2026-07-28T14:00:00Z", 50),
      ],
      new Date("2026-07-28T09:30:00Z"),
    );

    expect(window?.start.getUTCHours()).toBe(12);
    expect(window?.end.getUTCHours()).toBe(14);
    expect(window?.hours).toHaveLength(2);
  });

  it("ignores past hours even when they score better", () => {
    const window = findBestWindow(
      [
        scored("2026-07-28T12:00:00Z", 100),
        scored("2026-07-28T13:00:00Z", 100),
        scored("2026-07-28T14:00:00Z", 100),
        scored("2026-07-28T16:00:00Z", 70),
        scored("2026-07-28T17:00:00Z", 75),
      ],
      new Date("2026-07-28T15:30:00Z"),
    );

    expect(window?.start.getUTCHours()).toBe(16);
    expect(window?.end.getUTCHours()).toBe(18);
  });

  it("returns null when fewer than two consecutive future hours remain", () => {
    const window = findBestWindow(
      [scored("2026-07-28T23:00:00Z", 90)],
      new Date("2026-07-28T22:30:00Z"),
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
