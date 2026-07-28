import type { SelectedLocation } from "../domain/types";
import { roundCoordinate } from "../utils/numbers";

export function createGpsLocation(latitude: number, longitude: number): SelectedLocation {
  const roundedLatitude = roundCoordinate(latitude);
  const roundedLongitude = roundCoordinate(longitude);

  return {
    type: "gps",
    key: `gps:${roundedLatitude}:${roundedLongitude}`,
    displayName: "Sua localizacao",
    latitude,
    longitude,
  };
}

export function getBrowserLocation(
  geolocation: Geolocation | undefined = navigator.geolocation,
): Promise<SelectedLocation> {
  if (!geolocation) {
    return Promise.reject(new Error("Geolocation unsupported"));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve(createGpsLocation(position.coords.latitude, position.coords.longitude));
      },
      () => reject(new Error("Geolocation denied")),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60 * 60 * 1000,
      },
    );
  });
}
