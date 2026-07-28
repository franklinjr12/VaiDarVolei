import { getRandomPhrase } from "./phrases";
import { scoreForecast } from "./scoring";
import type { HourlyWeather, HourScore, PlayingWindow, Verdict, VolleyballVerdict } from "./types";
import { findBestWindow } from "./windows";

export function classifyWindow(window: PlayingWindow): Verdict {
  if (window.thunderstorm) return "BAD";
  if (window.averageScore >= 75 && !window.unsafeWeather) return "GOOD";
  if (window.averageScore >= 50) return "MAYBE";
  return "BAD";
}

export function createVerdict(
  forecast: HourlyWeather[],
  options: { now?: Date; phrase?: string; random?: () => number } = {},
): VolleyballVerdict {
  const scoredHours = scoreForecast(forecast);
  const bestWindow = findBestWindow(scoredHours, options.now);

  if (!bestWindow) {
    const remaining = remainingHours(scoredHours, options.now);
    return {
      verdict: "BAD",
      score: 0,
      phrase: options.phrase ?? "HOJE JA FOI.",
      explanation: "Ja nao sobrou uma janela boa de 2 horas hoje.",
      averageTemperature: average(remaining.map((hour) => hour.hour.temperature)),
      maxRainProbability: max(remaining.map((hour) => hour.hour.precipitationProbability)),
      averageWindSpeed: average(remaining.map((hour) => hour.hour.windSpeed)),
      thunderstorm: remaining.some((hour) => hour.unsafeWeather),
      noWindow: true,
    };
  }

  const verdict = classifyWindow(bestWindow);

  return {
    verdict,
    score: bestWindow.averageScore,
    phrase: options.phrase ?? getRandomPhrase(verdict, options.random),
    explanation: explainWindow(bestWindow, verdict),
    bestWindow: {
      start: bestWindow.start,
      end: bestWindow.end,
    },
    averageTemperature: average(bestWindow.hours.map((hour) => hour.hour.temperature)),
    maxRainProbability: max(bestWindow.hours.map((hour) => hour.hour.precipitationProbability)),
    averageWindSpeed: average(bestWindow.hours.map((hour) => hour.hour.windSpeed)),
    thunderstorm: bestWindow.thunderstorm,
    noWindow: false,
  };
}

export function explainWindow(window: PlayingWindow, verdict: Verdict): string {
  if (window.thunderstorm) return "Tem trovoada na melhor janela disponivel. Melhor nao bancar o heroi.";

  const reasons = new Set(window.hours.flatMap((hour) => hour.reasons));

  if (verdict === "GOOD") {
    if (reasons.size === 0) return "Pouca chance de chuva e vento tranquilo.";
    return "A melhor janela esta boa, so fica de olho nos detalhes do clima.";
  }

  if (reasons.has("chuva")) return "Da jogo, mas existe chance de chuva no caminho.";
  if (reasons.has("vento")) return "O vento pode incomodar as manchetes e os saques.";
  if (reasons.has("calor")) return "O calor vai pedir agua, sombra e protetor.";
  if (reasons.has("frio")) return "Esta mais frio que o ideal para uma partida tranquila.";

  return "A previsao nao esta perfeita, mas ainda da para arriscar.";
}

function remainingHours(hours: HourScore[], now = new Date()): HourScore[] {
  return hours.filter((hour) => hour.hour.timestamp.getTime() >= now.getTime());
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}
