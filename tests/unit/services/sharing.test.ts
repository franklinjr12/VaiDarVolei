import { describe, expect, it, vi } from "vitest";
import type { SelectedLocation, VolleyballVerdict } from "../../../src/domain/types";
import { buildShareText, shareVerdict } from "../../../src/services/sharing";

describe("sharing", () => {
  it("builds a concise result message", () => {
    const text = buildShareText(verdict(), location());

    expect(text).toContain("METE FICHA.");
    expect(text).toContain("Proximas 2 horas:");
    expect(text).not.toContain("Melhor horario");
  });

  it("uses clipboard when native share is unavailable", async () => {
    const writeText = vi.fn(async () => undefined);
    const result = await shareVerdict(verdict(), location(), {
      clipboard: { writeText } as unknown as Clipboard,
      share: undefined,
    });

    expect(result.method).toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Vai Dar Volei?"));
  });
});

function verdict(): VolleyballVerdict {
  return {
    verdict: "GOOD",
    score: 90,
    phrase: "METE FICHA.",
    explanation: "Pouca chance de chuva e vento tranquilo.",
    playWindow: {
      start: new Date("2026-07-28T15:00:00-03:00"),
      end: new Date("2026-07-28T17:00:00-03:00"),
    },
    averageTemperature: 24,
    maxRainProbability: 8,
    averageWindSpeed: 12,
    thunderstorm: false,
    noWindow: false,
  };
}

function location(): SelectedLocation {
  return {
    type: "city",
    key: "city:6322752",
    displayName: "Curitiba, Parana",
    latitude: -25.4284,
    longitude: -49.2733,
  };
}
