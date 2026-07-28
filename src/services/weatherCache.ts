import { WEATHER_CACHE_TTL_MS } from "../config";
import type { HourlyWeather, SelectedLocation } from "../domain/types";
import {
  getWeatherCache as readWeatherCache,
  saveWeatherCache as writeWeatherCache,
  type WeatherCache,
} from "./storage";

export function isCacheFresh(cache: WeatherCache, now = Date.now()): boolean {
  return now - cache.fetchedAt < WEATHER_CACHE_TTL_MS;
}

export function isCacheForLocation(cache: WeatherCache, location: SelectedLocation): boolean {
  return cache.locationKey === location.key;
}

export function getCachedForecast(
  location: SelectedLocation,
  options: { now?: number; storage?: Storage; allowStale?: boolean } = {},
): WeatherCache | null {
  const cache = readWeatherCache(options.storage);
  if (!cache || !isCacheForLocation(cache, location)) return null;
  if (options.allowStale || isCacheFresh(cache, options.now)) return cache;
  return null;
}

export function saveForecast(
  location: SelectedLocation,
  forecast: HourlyWeather[],
  options: { phrase?: string; now?: number; storage?: Storage } = {},
): WeatherCache {
  const cache = {
    locationKey: location.key,
    fetchedAt: options.now ?? Date.now(),
    forecast,
    phrase: options.phrase,
  };

  writeWeatherCache(cache, options.storage);
  return cache;
}
