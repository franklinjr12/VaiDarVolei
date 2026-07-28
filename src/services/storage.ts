import { LOCATION_STORAGE_KEY, WEATHER_CACHE_STORAGE_KEY } from "../config";
import type { HourlyWeather, SelectedLocation } from "../domain/types";

export interface WeatherCache {
  locationKey: string;
  fetchedAt: number;
  forecast: HourlyWeather[];
  phrase?: string;
}

type StoredWeatherCache = Omit<WeatherCache, "forecast"> & {
  forecast: Array<Omit<HourlyWeather, "timestamp"> & { timestamp: string }>;
};

export function saveSelectedLocation(location: SelectedLocation, storage = window.localStorage): void {
  safeSet(storage, LOCATION_STORAGE_KEY, JSON.stringify(location));
}

export function getSelectedLocation(storage = window.localStorage): SelectedLocation | null {
  const parsed = safeJson(storage.getItem(LOCATION_STORAGE_KEY));
  if (!isSelectedLocation(parsed)) return null;
  return parsed;
}

export function clearSelectedLocation(storage = window.localStorage): void {
  storage.removeItem(LOCATION_STORAGE_KEY);
}

export function saveWeatherCache(cache: WeatherCache, storage = window.localStorage): void {
  const stored: StoredWeatherCache = {
    ...cache,
    forecast: cache.forecast.map((hour) => ({
      ...hour,
      timestamp: hour.timestamp.toISOString(),
    })),
  };

  safeSet(storage, WEATHER_CACHE_STORAGE_KEY, JSON.stringify(stored));
}

export function getWeatherCache(storage = window.localStorage): WeatherCache | null {
  const parsed = safeJson(storage.getItem(WEATHER_CACHE_STORAGE_KEY));
  if (!isStoredWeatherCache(parsed)) return null;

  return {
    ...parsed,
    forecast: parsed.forecast.map((hour) => ({
      ...hour,
      timestamp: new Date(hour.timestamp),
    })),
  };
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Private browsing and full storage should not break the app.
  }
}

function safeJson(value: string | null): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isSelectedLocation(value: unknown): value is SelectedLocation {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<SelectedLocation>;
  return (
    (location.type === "gps" || location.type === "city") &&
    typeof location.key === "string" &&
    typeof location.displayName === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    (location.timezone === undefined || typeof location.timezone === "string")
  );
}

function isStoredWeatherCache(value: unknown): value is StoredWeatherCache {
  if (!value || typeof value !== "object") return false;
  const cache = value as Partial<StoredWeatherCache>;
  return (
    typeof cache.locationKey === "string" &&
    typeof cache.fetchedAt === "number" &&
    Array.isArray(cache.forecast) &&
    cache.forecast.every(isStoredHour) &&
    (cache.phrase === undefined || typeof cache.phrase === "string")
  );
}

function isStoredHour(value: unknown): value is StoredWeatherCache["forecast"][number] {
  if (!value || typeof value !== "object") return false;
  const hour = value as Partial<StoredWeatherCache["forecast"][number]>;
  const date = typeof hour.timestamp === "string" ? new Date(hour.timestamp) : null;

  return (
    date !== null &&
    !Number.isNaN(date.getTime()) &&
    typeof hour.temperature === "number" &&
    typeof hour.apparentTemperature === "number" &&
    typeof hour.precipitationProbability === "number" &&
    typeof hour.precipitation === "number" &&
    typeof hour.weatherCode === "number" &&
    typeof hour.windSpeed === "number" &&
    typeof hour.windGusts === "number"
  );
}
