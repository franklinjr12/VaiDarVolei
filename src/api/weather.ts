import { OPEN_METEO_FORECAST_URL } from "../config";
import type { HourlyWeather, SelectedLocation } from "../domain/types";

const REQUIRED_HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
] as const;

interface ForecastApiResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
  };
}

export async function fetchWeatherForecast(
  location: Pick<SelectedLocation, "latitude" | "longitude">,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<HourlyWeather[]> {
  const fetcher = options.fetcher ?? fetch;
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("hourly", REQUIRED_HOURLY_FIELDS.join(","));

  const response = await fetcher(url, { signal: options.signal });
  if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);

  return normalizeForecast((await response.json()) as ForecastApiResponse);
}

export function normalizeForecast(data: ForecastApiResponse): HourlyWeather[] {
  const hourly = data.hourly;
  if (!hourly || !Array.isArray(hourly.time))
    throw new Error("Weather response missing hourly data");

  validateNumberArray(hourly.temperature_2m, "temperature_2m", hourly.time.length);
  validateNumberArray(hourly.apparent_temperature, "apparent_temperature", hourly.time.length);
  validateNumberArray(
    hourly.precipitation_probability,
    "precipitation_probability",
    hourly.time.length,
  );
  validateNumberArray(hourly.precipitation, "precipitation", hourly.time.length);
  validateNumberArray(hourly.weather_code, "weather_code", hourly.time.length);
  validateNumberArray(hourly.wind_speed_10m, "wind_speed_10m", hourly.time.length);
  validateNumberArray(hourly.wind_gusts_10m, "wind_gusts_10m", hourly.time.length);

  return hourly.time.map((timestamp, index) => {
    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      throw new Error(`Invalid weather timestamp at index ${index}`);
    }

    return {
      timestamp: parsedTimestamp,
      temperature: hourly.temperature_2m?.[index] ?? 0,
      apparentTemperature: hourly.apparent_temperature?.[index] ?? 0,
      precipitationProbability: hourly.precipitation_probability?.[index] ?? 0,
      precipitation: hourly.precipitation?.[index] ?? 0,
      weatherCode: hourly.weather_code?.[index] ?? 0,
      windSpeed: hourly.wind_speed_10m?.[index] ?? 0,
      windGusts: hourly.wind_gusts_10m?.[index] ?? 0,
    };
  });
}

function validateNumberArray(
  value: unknown,
  label: string,
  expectedLength: number,
): asserts value is number[] {
  if (
    !Array.isArray(value) ||
    value.length !== expectedLength ||
    value.some((item) => typeof item !== "number")
  ) {
    throw new Error(`Weather response has invalid ${label}`);
  }
}
