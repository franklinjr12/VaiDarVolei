import { expect, test, type Page } from "@playwright/test";

const FIXED_NOW = new Date("2026-07-28T14:00:00-03:00");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test("first visit with GPS saves location and weather cache", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -25.4284, longitude: -49.2733 });

  let forecastRequests = 0;
  await mockForecast(page, () => {
    forecastRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Usar minha localizacao/ }).click();

  await expect(page.getByText("Melhor horario")).toBeVisible();
  await expect(page.getByText("Sua localizacao")).toBeVisible();
  expect(forecastRequests).toBe(1);

  const stored = await page.evaluate(() => ({
    location: localStorage.getItem("vaiDarVolei:selectedLocation:v1"),
    cache: localStorage.getItem("vaiDarVolei:weatherCache:v1"),
  }));
  expect(stored.location).toContain("gps:-25.428:-49.273");
  expect(stored.cache).toContain("gps:-25.428:-49.273");
});

test("returning user reuses fresh cache without a weather request", async ({ page }) => {
  await seedCachedForecast(page, { ageMinutes: 20 });
  let forecastRequests = 0;
  await mockForecast(page, () => {
    forecastRequests += 1;
  });

  await page.goto("/");

  await expect(page.getByText("Curitiba, Parana")).toBeVisible();
  await expect(page.getByText(/cache ativo/)).toBeVisible();
  expect(forecastRequests).toBe(0);
});

test("expired cache fetches weather once", async ({ page }) => {
  await seedCachedForecast(page, { ageMinutes: 61 });
  let forecastRequests = 0;
  await mockForecast(page, () => {
    forecastRequests += 1;
  });

  await page.goto("/");

  await expect(page.getByText("Curitiba, Parana")).toBeVisible();
  expect(forecastRequests).toBe(1);
});

test("manual city search persists the selected city", async ({ page }) => {
  await mockGeocoding(page);
  await mockForecast(page);

  await page.goto("/");
  await page.getByLabel("Digite sua cidade").fill("Curitiba");
  await page.getByRole("option", { name: /Curitiba/ }).click();

  await expect(page.getByText("Curitiba, Parana, Brasil")).toBeVisible();
  const location = await page.evaluate(() =>
    localStorage.getItem("vaiDarVolei:selectedLocation:v1"),
  );
  expect(location).toContain("city:6322752");
});

test("location permission denial keeps city search available", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Usar minha localizacao/ }).click();

  await expect(page.getByText("Sem crise. Digite sua cidade ai embaixo.")).toBeVisible();
  await expect(page.getByLabel("Digite sua cidade")).toBeEditable();
});

test("network failure uses stale cache with warning", async ({ page }) => {
  await seedCachedForecast(page, { ageMinutes: 90 });
  await page.route("**/v1/forecast**", async (route) => {
    await route.fulfill({ status: 503, body: "{}" });
  });

  await page.goto("/");

  await expect(page.getByText("Usando a ultima previsao salva.")).toBeVisible();
  await expect(page.getByText("Curitiba, Parana")).toBeVisible();
});

test("share falls back to clipboard", async ({ page }) => {
  await seedCachedForecast(page, { ageMinutes: 20 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          Reflect.set(window, "__sharedText", text);
        },
      },
      configurable: true,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Compartilhar" }).click();

  await expect(page.getByText("Copiado! Agora manda no grupo.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__sharedText")))
    .toContain("Vai Dar Volei?");
});

async function mockForecast(page: Page, onRequest: () => void = () => undefined): Promise<void> {
  await page.route("**/v1/forecast**", async (route) => {
    onRequest();
    await route.fulfill({ json: forecastResponse() });
  });
}

async function mockGeocoding(page: Page): Promise<void> {
  await page.route("**/v1/search**", async (route) => {
    await route.fulfill({
      json: {
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
      },
    });
  });
}

async function seedCachedForecast(page: Page, options: { ageMinutes: number }): Promise<void> {
  await page.addInitScript(
    ({ ageMinutes, now, forecast }) => {
      localStorage.setItem(
        "vaiDarVolei:selectedLocation:v1",
        JSON.stringify({
          type: "city",
          key: "city:6322752",
          displayName: "Curitiba, Parana",
          latitude: -25.4284,
          longitude: -49.2733,
          timezone: "America/Sao_Paulo",
        }),
      );
      localStorage.setItem(
        "vaiDarVolei:weatherCache:v1",
        JSON.stringify({
          locationKey: "city:6322752",
          fetchedAt: now - ageMinutes * 60 * 1000,
          forecast,
          phrase: "METE FICHA.",
        }),
      );
    },
    {
      ageMinutes: options.ageMinutes,
      now: FIXED_NOW.getTime(),
      forecast: storedForecast(),
    },
  );
}

function forecastResponse() {
  return {
    hourly: {
      time: ["2026-07-28T15:00", "2026-07-28T16:00", "2026-07-28T17:00", "2026-07-28T18:00"],
      temperature_2m: [24, 25, 25, 24],
      apparent_temperature: [24, 25, 25, 24],
      precipitation_probability: [8, 8, 12, 18],
      precipitation: [0, 0, 0, 0.1],
      weather_code: [1, 1, 2, 2],
      wind_speed_10m: [10, 12, 13, 12],
      wind_gusts_10m: [15, 18, 20, 18],
    },
  };
}

function storedForecast() {
  const hourly = forecastResponse().hourly;
  return hourly.time.map((timestamp, index) => ({
    timestamp: new Date(timestamp).toISOString(),
    temperature: hourly.temperature_2m[index],
    apparentTemperature: hourly.apparent_temperature[index],
    precipitationProbability: hourly.precipitation_probability[index],
    precipitation: hourly.precipitation[index],
    weatherCode: hourly.weather_code[index],
    windSpeed: hourly.wind_speed_10m[index],
    windGusts: hourly.wind_gusts_10m[index],
  }));
}
