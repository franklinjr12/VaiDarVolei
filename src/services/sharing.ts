import type { SelectedLocation, VolleyballVerdict } from "../domain/types";
import { formatHourRange } from "../utils/date";

export interface ShareResult {
  method: "native" | "clipboard";
  text: string;
}

export function buildShareText(verdict: VolleyballVerdict, location: SelectedLocation): string {
  const windowText = verdict.bestWindow
    ? `Melhor horario: ${formatHourRange(verdict.bestWindow.start, verdict.bestWindow.end)}`
    : "Hoje ja foi.";

  return [
    "Vai Dar Volei?",
    verdict.phrase,
    location.displayName,
    windowText,
    `${Math.round(verdict.averageTemperature)}C | ${verdict.maxRainProbability}% chuva | ${Math.round(verdict.averageWindSpeed)} km/h vento`,
  ].join("\n");
}

interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard: Pick<Clipboard, "writeText">;
}

export async function shareVerdict(
  verdict: VolleyballVerdict,
  location: SelectedLocation,
  navigatorLike: ShareNavigator = navigator,
): Promise<ShareResult> {
  const text = buildShareText(verdict, location);

  if (navigatorLike.share) {
    await navigatorLike.share({
      title: "Vai Dar Volei?",
      text,
    });
    return { method: "native", text };
  }

  await navigatorLike.clipboard.writeText(text);
  return { method: "clipboard", text };
}
