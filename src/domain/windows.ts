import type { HourScore, PlayingWindow } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const MINIMUM_THIRD_HOUR_SCORE = 60;

export function nextPlayableHour(now = new Date()): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);

  if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    next.setHours(next.getHours() + 1);
  }

  return next;
}

export function findBestWindow(hours: HourScore[], now = new Date()): PlayingWindow | null {
  const available = hours
    .filter((hour) => hour.hour.timestamp.getTime() >= nextPlayableHour(now).getTime())
    .sort((a, b) => a.hour.timestamp.getTime() - b.hour.timestamp.getTime());

  const candidates: PlayingWindow[] = [];

  for (let index = 0; index < available.length - 1; index += 1) {
    const first = available[index];
    const second = available[index + 1];

    if (!first || !second || !areConsecutive(first, second)) continue;

    const windowHours = [first, second];
    const third = available[index + 2];

    if (third && areConsecutive(second, third) && third.score >= MINIMUM_THIRD_HOUR_SCORE) {
      windowHours.push(third);
    }

    candidates.push(toPlayingWindow(windowHours));
  }

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => b.averageScore - a.averageScore)[0] ?? null;
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
