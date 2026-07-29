import type { HourScore, PlayingWindow } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export function currentForecastHour(now = new Date()): Date {
  const current = new Date(now);
  current.setMinutes(0, 0, 0);
  return current;
}

export function findCurrentWindow(hours: HourScore[], now = new Date()): PlayingWindow | null {
  const start = currentForecastHour(now).getTime();
  const end = start + HOUR_MS;
  const available = new Map(hours.map((hour) => [hour.hour.timestamp.getTime(), hour]));

  const first = available.get(start);
  const second = available.get(end);
  if (!first || !second || !areConsecutive(first, second)) return null;

  return toPlayingWindow([first, second]);
}

function areConsecutive(first: HourScore, second: HourScore): boolean {
  return second.hour.timestamp.getTime() - first.hour.timestamp.getTime() === HOUR_MS;
}

function toPlayingWindow(hours: HourScore[]): PlayingWindow {
  const start = hours[0]?.hour.timestamp;
  const last = hours[hours.length - 1]?.hour.timestamp;

  if (!start || !last) {
    throw new Error("Playing windows require at least one hour");
  }

  const averageScore = Math.round(
    hours.reduce((total, hour) => total + hour.score, 0) / hours.length,
  );
  const thunderstorm = hours.some((hour) => hour.unsafeWeather);

  return {
    start,
    end: new Date(last.getTime() + HOUR_MS),
    hours,
    averageScore,
    thunderstorm,
    unsafeWeather: thunderstorm || hours.some((hour) => hour.score < 50),
  };
}
