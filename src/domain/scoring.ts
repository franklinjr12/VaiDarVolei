import type { HourlyWeather, HourScore, Verdict } from "./types";

export const THUNDERSTORM_CODES = new Set([95, 96, 99]);

export const SCORE_THRESHOLDS = {
  good: 75,
  maybe: 50,
} as const;

export function rainProbabilityPenalty(probability: number): number {
  if (probability <= 20) return 0;
  if (probability <= 35) return 8;
  if (probability <= 50) return 18;
  if (probability <= 65) return 35;
  if (probability <= 80) return 55;
  return 70;
}

export function precipitationPenalty(precipitation: number): number {
  if (precipitation <= 0.1) return 0;
  if (precipitation <= 0.5) return 10;
  if (precipitation <= 1.5) return 25;
  if (precipitation <= 3) return 45;
  return 65;
}

export function windPenalty(windSpeed: number): number {
  if (windSpeed < 15) return 0;
  if (windSpeed <= 20) return 5;
  if (windSpeed <= 25) return 12;
  if (windSpeed <= 35) return 25;
  return 45;
}

export function windGustPenalty(windGusts: number): number {
  if (windGusts < 25) return 0;
  if (windGusts <= 35) return 5;
  if (windGusts <= 45) return 12;
  return 25;
}

export function apparentTemperaturePenalty(apparentTemperature: number): number {
  if (apparentTemperature >= 16 && apparentTemperature <= 30) return 0;
  if (apparentTemperature >= 12 && apparentTemperature <= 15.9) return 8;
  if (apparentTemperature >= 30.1 && apparentTemperature <= 33) return 8;
  if (apparentTemperature >= 8 && apparentTemperature <= 11.9) return 18;
  if (apparentTemperature >= 33.1 && apparentTemperature <= 36) return 18;
  return 35;
}

export function isThunderstorm(weatherCode: number): boolean {
  return THUNDERSTORM_CODES.has(weatherCode);
}

export function rateScore(score: number): Verdict {
  if (score >= SCORE_THRESHOLDS.good) return "GOOD";
  if (score >= SCORE_THRESHOLDS.maybe) return "MAYBE";
  return "BAD";
}

export function scoreHour(hour: HourlyWeather): HourScore {
  if (isThunderstorm(hour.weatherCode)) {
    return {
      hour,
      score: 0,
      rating: "BAD",
      unsafeWeather: true,
      reasons: ["trovoada"],
    };
  }

  const penalties = [
    rainProbabilityPenalty(hour.precipitationProbability),
    precipitationPenalty(hour.precipitation),
    windPenalty(hour.windSpeed),
    windGustPenalty(hour.windGusts),
    apparentTemperaturePenalty(hour.apparentTemperature),
  ];
  const score = clampScore(100 - penalties.reduce((total, penalty) => total + penalty, 0));

  return {
    hour,
    score,
    rating: rateScore(score),
    unsafeWeather: false,
    reasons: describePenalties(hour),
  };
}

export function scoreForecast(hours: HourlyWeather[]): HourScore[] {
  return hours.map(scoreHour);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function describePenalties(hour: HourlyWeather): string[] {
  const reasons: string[] = [];
  if (hour.precipitationProbability > 50 || hour.precipitation > 0.5) reasons.push("chuva");
  if (hour.windSpeed > 25 || hour.windGusts > 35) reasons.push("vento");
  if (hour.apparentTemperature < 12) reasons.push("frio");
  if (hour.apparentTemperature > 33) reasons.push("calor");
  return reasons;
}
