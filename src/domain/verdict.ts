import { getRandomPhrase } from "./phrases";
import { scoreForecast } from "./scoring";
import type { HourlyWeather, HourScore, PlayingWindow, Verdict, VolleyballVerdict } from "./types";
import { currentForecastHour, findCurrentWindow } from "./windows";

export function classifyWindow(window: PlayingWindow): Verdict {
  if (window.thunderstorm) return "BAD";
  if (window.averageScore >= 75 && !window.unsafeWeather) return "GOOD";
  if (window.averageScore >= 50) return "MAYBE";
  return "BAD";
}

export function createVerdict(
  forecast: HourlyWeather[],
  options: { now?: Date; random?: () => number } = {},
): VolleyballVerdict {
  const scoredHours = scoreForecast(forecast);
  const playWindow = findCurrentWindow(scoredHours, options.now);

  if (!playWindow) {
    const upcoming = upcomingHours(scoredHours, options.now);
    return {
      verdict: "BAD",
      score: 0,
      phrase: "NAO TEM PREVISAO SUFICIENTE.",
      explanation: "Nao tenho previsao suficiente para as proximas 2 horas.",
      averageTemperature: average(upcoming.map((hour) => hour.hour.temperature)),
      maxRainProbability: max(upcoming.map((hour) => hour.hour.precipitationProbability)),
      averageWindSpeed: average(upcoming.map((hour) => hour.hour.windSpeed)),
      thunderstorm: upcoming.some((hour) => hour.unsafeWeather),
      noWindow: true,
    };
  }

  const verdict = classifyWindow(playWindow);

  return {
    verdict,
    score: playWindow.averageScore,
    phrase: getRandomPhrase(verdict, options.random),
    explanation: explainWindow(playWindow, verdict),
    playWindow: {
      start: playWindow.start,
      end: playWindow.end,
    },
    averageTemperature: average(playWindow.hours.map((hour) => hour.hour.temperature)),
    maxRainProbability: max(playWindow.hours.map((hour) => hour.hour.precipitationProbability)),
    averageWindSpeed: average(playWindow.hours.map((hour) => hour.hour.windSpeed)),
    thunderstorm: playWindow.thunderstorm,
    noWindow: false,
  };
}

export function explainWindow(window: PlayingWindow, verdict: Verdict): string {
  if (window.thunderstorm) return "Tem trovoada nas proximas 2 horas. Melhor nao bancar o heroi.";

  const reasons = new Set(window.hours.flatMap((hour) => hour.reasons));

  if (verdict === "GOOD") {
    if (reasons.size === 0) return "Pouca chance de chuva e vento tranquilo nas proximas 2 horas.";
    return "As proximas 2 horas estao boas, so fica de olho nos detalhes do clima.";
  }

  if (verdict === "BAD") {
    if (reasons.has("chuva")) return "Chuva nas proximas 2 horas. Melhor esperar abrir.";
    if (reasons.has("vento")) return "Vento forte nas proximas 2 horas. A bola vai sofrer.";
    if (reasons.has("calor")) return "Calor pesado nas proximas 2 horas. Melhor esperar aliviar.";
    if (reasons.has("frio")) return "Frio demais nas proximas 2 horas para uma partida tranquila.";
  }

  if (reasons.has("chuva")) return "Da jogo, mas existe chance de chuva nas proximas 2 horas.";
  if (reasons.has("vento")) return "O vento pode incomodar nas proximas 2 horas.";
  if (reasons.has("calor"))
    return "O calor nas proximas 2 horas vai pedir agua, sombra e protetor.";
  if (reasons.has("frio"))
    return "Esta mais frio que o ideal nas proximas 2 horas para uma partida tranquila.";

  return "A previsao das proximas 2 horas nao esta perfeita, mas ainda da para arriscar.";
}

function upcomingHours(hours: HourScore[], now = new Date()): HourScore[] {
  return hours.filter(
    (hour) => hour.hour.timestamp.getTime() >= currentForecastHour(now).getTime(),
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}
