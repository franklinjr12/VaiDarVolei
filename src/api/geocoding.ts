import { OPEN_METEO_GEOCODING_URL } from "../config";
import type { SelectedLocation } from "../domain/types";
import { roundCoordinate } from "../utils/numbers";

interface GeocodingApiResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface GeocodingApiResponse {
  results?: GeocodingApiResult[];
}

export async function searchCities(
  query: string,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<SelectedLocation[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];

  const fetcher = options.fetcher ?? fetch;
  const url = new URL(OPEN_METEO_GEOCODING_URL);
  url.searchParams.set("name", normalizedQuery);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "pt");
  url.searchParams.set("format", "json");

  const response = await fetcher(url, { signal: options.signal });
  if (!response.ok) throw new Error(`Geocoding request failed with ${response.status}`);

  const data = (await response.json()) as GeocodingApiResponse;
  if (!data || !Array.isArray(data.results)) return [];

  return data.results.map(toSelectedLocation).filter((location) => location !== null);
}

function toSelectedLocation(result: GeocodingApiResult): SelectedLocation | null {
  if (
    typeof result.name !== "string" ||
    typeof result.latitude !== "number" ||
    typeof result.longitude !== "number"
  ) {
    return null;
  }

  const displayParts = [result.name, result.admin1, result.country].filter(Boolean);
  const id =
    typeof result.id === "number"
      ? String(result.id)
      : `${roundCoordinate(result.latitude)}:${roundCoordinate(result.longitude)}`;

  return {
    type: "city",
    key: `city:${id}`,
    displayName: displayParts.join(", "),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  };
}
