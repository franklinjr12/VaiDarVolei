import { describe, expect, it, vi } from "vitest";
import { fetchWeatherForecast, normalizeForecast } from "../../../src/api/weather";

describe("weather API", () => {
  it("requests only today's required hourly fields", async () => {
    const fetcher = vi.fn(async () => Response.json(validResponse()));

    await fetchWeatherForecast({ latitude: -25.4, longitude: -49.2 }, { fetcher: fetcher as unknown as typeof fetch });

    const calls = fetcher.mock.calls as unknown as Array<[unknown]>;
    const url = new URL(String(calls[0]?.[0]));
    expect(url.searchParams.get("forecast_days")).toBe("1");
    expect(url.searchParams.get("hourly")).toContain("temperature_2m");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
  });

  it("normalizes hourly data", () => {
    expect(normalizeForecast(validResponse())[0]).toMatchObject({
      temperature: 24,
      apparentTemperature: 25,
      precipitationProbability: 10,
      windSpeed: 12,
    });
  });

  it("rejects missing fields", () => {
    expect(() => normalizeForecast({ hourly: { time: ["2026-07-28T12:00"] } })).toThrow();
  });
});

function validResponse() {
  return {
    hourly: {
      time: ["2026-07-28T12:00"],
      temperature_2m: [24],
      apparent_temperature: [25],
      precipitation_probability: [10],
      precipitation: [0],
      weather_code: [1],
      wind_speed_10m: [12],
      wind_gusts_10m: [18],
    },
  };
}
