import { describe, expect, it, vi } from "vitest";
import { searchCities } from "../../../src/api/geocoding";

describe("geocoding API", () => {
  it("does not search before three characters", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(searchCities("cu", { fetcher })).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("normalizes city results", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: 6322752,
            name: "Curitiba",
            latitude: -25.4284,
            longitude: -49.2733,
            admin1: "Parana",
            country: "Brasil",
            timezone: "America/Sao_Paulo",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    await expect(searchCities("Curitiba", { fetcher })).resolves.toEqual([
      {
        type: "city",
        key: "city:6322752",
        displayName: "Curitiba, Parana, Brasil",
        latitude: -25.4284,
        longitude: -49.2733,
        timezone: "America/Sao_Paulo",
      },
    ]);
  });
});
