import { describe, expect, it } from "vitest";
import {
  GOOD_PHRASES,
  MAYBE_PHRASES,
  BAD_PHRASES,
  getRandomPhrase,
} from "../../../src/domain/phrases";
import { createVerdict } from "../../../src/domain/verdict";
import type { HourlyWeather } from "../../../src/domain/types";

describe("phrase catalog", () => {
  it("contains at least fifteen phrases per verdict", () => {
    expect(GOOD_PHRASES.length).toBeGreaterThanOrEqual(15);
    expect(MAYBE_PHRASES.length).toBeGreaterThanOrEqual(15);
    expect(BAD_PHRASES.length).toBeGreaterThanOrEqual(15);
  });

  it("selects a deterministic phrase when random is injected", () => {
    expect(getRandomPhrase("GOOD", () => 0)).toBe(GOOD_PHRASES[0]);
  });
});

describe("verdict generation", () => {
  it("creates a GOOD verdict for a clean window", () => {
    const verdict = createVerdict(
      [weather("2026-07-28T15:00:00Z", {}), weather("2026-07-28T16:00:00Z", {})],
      { now: new Date("2026-07-28T15:00:00Z"), random: () => 0 },
    );

    expect(verdict.verdict).toBe("GOOD");
    expect(verdict.playWindow?.start.getUTCHours()).toBe(15);
    expect(verdict.noWindow).toBe(false);
  });

  it("uses rainy next 2 hours even when later hours are clear", () => {
    const verdict = createVerdict(
      [
        weather("2026-07-28T14:00:00Z", { precipitationProbability: 95, precipitation: 2 }),
        weather("2026-07-28T15:00:00Z", { precipitationProbability: 90, precipitation: 1 }),
        weather("2026-07-28T16:00:00Z", {}),
        weather("2026-07-28T17:00:00Z", {}),
      ],
      { now: new Date("2026-07-28T14:25:00Z"), random: () => 0 },
    );

    expect(verdict.verdict).toBe("BAD");
    expect(verdict.playWindow?.start.getUTCHours()).toBe(14);
    expect(verdict.explanation).toBe("Chuva nas proximas 2 horas. Melhor esperar abrir.");
  });

  it("does not allow thunderstorm windows to be GOOD", () => {
    const verdict = createVerdict(
      [weather("2026-07-28T15:00:00Z", { weatherCode: 95 }), weather("2026-07-28T16:00:00Z", {})],
      { now: new Date("2026-07-28T15:00:00Z") },
    );

    expect(verdict.verdict).toBe("BAD");
    expect(verdict.thunderstorm).toBe(true);
    expect(verdict.noWindow).toBe(false);
  });

  it("returns a no-window result when the next 2 hours are incomplete", () => {
    const verdict = createVerdict([weather("2026-07-28T23:00:00Z", {})], {
      now: new Date("2026-07-28T22:30:00Z"),
    });

    expect(verdict.noWindow).toBe(true);
    expect(verdict.phrase).toBe("NAO TEM PREVISAO SUFICIENTE.");
  });
});

function weather(timestamp: string, overrides: Partial<HourlyWeather>): HourlyWeather {
  return {
    timestamp: new Date(timestamp),
    temperature: 24,
    apparentTemperature: 24,
    precipitationProbability: 0,
    precipitation: 0,
    weatherCode: 1,
    windSpeed: 10,
    windGusts: 15,
    ...overrides,
  };
}
