import { beforeEach, describe, expect, it } from "vitest";
import { WEATHER_CACHE_STORAGE_KEY } from "../../../src/config";
import type { HourlyWeather, SelectedLocation } from "../../../src/domain/types";
import { createGpsLocation } from "../../../src/services/geolocation";
import { getSelectedLocation, getWeatherCache, saveSelectedLocation } from "../../../src/services/storage";
import { getCachedForecast, isCacheFresh, saveForecast } from "../../../src/services/weatherCache";

const location: SelectedLocation = {
  type: "city",
  key: "city:6322752",
  displayName: "Curitiba, Parana",
  latitude: -25.4284,
  longitude: -49.2733,
  timezone: "America/Sao_Paulo",
};

describe("weather cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    [30 * 60 * 1000, true],
    [59 * 60 * 1000 + 59 * 1000, true],
    [60 * 60 * 1000 + 1000, false],
  ])("checks freshness for age %i", (age, expected) => {
    expect(isCacheFresh({ locationKey: location.key, fetchedAt: 1000, forecast: [] }, 1000 + age)).toBe(
      expected,
    );
  });

  it("uses cache for the same location only", () => {
    saveForecast(location, [hour()], { now: 1000 });
    expect(getCachedForecast(location, { now: 2000 })?.forecast).toHaveLength(1);
    expect(getCachedForecast({ ...location, key: "city:sao-paulo" }, { now: 2000 })).toBeNull();
  });

  it("rounds close GPS coordinates to the same key", () => {
    expect(createGpsLocation(-25.42841, -49.27331).key).toBe(
      createGpsLocation(-25.42839, -49.27329).key,
    );
  });

  it("ignores corrupt localStorage", () => {
    localStorage.setItem(WEATHER_CACHE_STORAGE_KEY, "{invalid json");
    expect(getWeatherCache()).toBeNull();
    expect(getSelectedLocation()).toBeNull();
  });

  it("persists and reads selected locations", () => {
    saveSelectedLocation(location);
    expect(getSelectedLocation()).toEqual(location);
  });
});

function hour(): HourlyWeather {
  return {
    timestamp: new Date("2026-07-28T12:00:00-03:00"),
    temperature: 24,
    apparentTemperature: 24,
    precipitationProbability: 0,
    precipitation: 0,
    weatherCode: 1,
    windSpeed: 10,
    windGusts: 15,
  };
}
