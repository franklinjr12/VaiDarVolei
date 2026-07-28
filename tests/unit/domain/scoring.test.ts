import { describe, expect, it } from "vitest";
import {
  apparentTemperaturePenalty,
  precipitationPenalty,
  rainProbabilityPenalty,
  scoreHour,
  windGustPenalty,
  windPenalty,
} from "../../../src/domain/scoring";
import type { HourlyWeather } from "../../../src/domain/types";

describe("scoring penalties", () => {
  it.each([
    [20, 0],
    [21, 8],
    [35, 8],
    [36, 18],
    [50, 18],
    [51, 35],
    [65, 35],
    [66, 55],
    [80, 55],
    [81, 70],
  ])("scores rain probability %i as penalty %i", (value, expected) => {
    expect(rainProbabilityPenalty(value)).toBe(expected);
  });

  it.each([
    [0.1, 0],
    [0.11, 10],
    [0.5, 10],
    [0.51, 25],
    [1.5, 25],
    [1.51, 45],
    [3, 45],
    [3.01, 65],
  ])("scores precipitation %i as penalty %i", (value, expected) => {
    expect(precipitationPenalty(value)).toBe(expected);
  });

  it.each([
    [14.9, 0],
    [15, 5],
    [20, 5],
    [20.1, 12],
    [25, 12],
    [25.1, 25],
    [35, 25],
    [35.1, 45],
  ])("scores wind %i as penalty %i", (value, expected) => {
    expect(windPenalty(value)).toBe(expected);
  });

  it.each([
    [24.9, 0],
    [25, 5],
    [35, 5],
    [35.1, 12],
    [45, 12],
    [45.1, 25],
  ])("scores gusts %i as penalty %i", (value, expected) => {
    expect(windGustPenalty(value)).toBe(expected);
  });

  it.each([
    [16, 0],
    [30, 0],
    [15.9, 8],
    [30.1, 8],
    [11.9, 18],
    [33.1, 18],
    [7.9, 35],
    [36.1, 35],
  ])("scores apparent temperature %i as penalty %i", (value, expected) => {
    expect(apparentTemperaturePenalty(value)).toBe(expected);
  });
});

describe("hour scoring", () => {
  it.each([95, 96, 99])("marks thunderstorm code %i unsafe with score zero", (weatherCode) => {
    expect(scoreHour(makeHour({ weatherCode }))).toMatchObject({
      score: 0,
      rating: "BAD",
      unsafeWeather: true,
    });
  });

  it("clamps scores to the 0-100 range", () => {
    const hour = scoreHour(
      makeHour({
        precipitationProbability: 100,
        precipitation: 10,
        windSpeed: 60,
        windGusts: 70,
        apparentTemperature: 41,
      }),
    );

    expect(hour.score).toBe(0);
  });
});

function makeHour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    timestamp: new Date("2026-07-28T12:00:00-03:00"),
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
