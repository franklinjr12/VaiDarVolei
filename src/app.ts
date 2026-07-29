import { searchCities } from "./api/geocoding";
import { fetchWeatherForecast } from "./api/weather";
import type { HourlyWeather, HourScore, SelectedLocation, VolleyballVerdict } from "./domain/types";
import { createVerdict } from "./domain/verdict";
import { scoreForecast } from "./domain/scoring";
import { currentForecastHour } from "./domain/windows";
import { getBrowserLocation } from "./services/geolocation";
import { shareVerdict } from "./services/sharing";
import {
  clearSelectedLocation,
  getSelectedLocation,
  saveSelectedLocation,
  type WeatherCache,
} from "./services/storage";
import { getCachedForecast, isCacheFresh, saveForecast } from "./services/weatherCache";
import { debounce } from "./utils/debounce";
import { formatHour, formatHourRange, formatTimeAgo } from "./utils/date";
import { round } from "./utils/numbers";

type SearchState = {
  controller?: AbortController;
  sequence: number;
};

type ForecastState = {
  key?: string;
  promise?: Promise<HourlyWeather[]>;
};

const searchState: SearchState = { sequence: 0 };
const forecastState: ForecastState = {};

export async function startApp(root: HTMLElement): Promise<void> {
  const location = getSelectedLocation();

  if (!location) {
    renderLocationScreen(root);
    return;
  }

  await loadForecast(root, location);
}

function renderLocationScreen(root: HTMLElement, message = ""): void {
  root.className = "";
  root.innerHTML = `
    <main class="app-shell location-view" aria-labelledby="app-title">
      <section class="location-panel">
        <img class="brand-ball" src="${assetPath("favicon.svg")}" alt="" width="64" height="64" />
        <p class="eyebrow">Praia, vento e teimosia</p>
        <h1 id="app-title">Vai Dar Volei?</h1>
        <p class="intro">Bora descobrir se hoje da jogo?</p>

        <button class="primary-action" data-action="use-gps" type="button">
          <span aria-hidden="true">📍</span>
          Usar minha localizacao
        </button>

        <div class="divider"><span>ou</span></div>

        <label class="field-label" for="city-search">Digite sua cidade</label>
        <div class="search-box" role="combobox" aria-expanded="false" aria-owns="city-results">
          <input id="city-search" type="search" autocomplete="off" placeholder="Curitiba" />
        </div>
        <div id="city-results" class="city-results" role="listbox" aria-live="polite"></div>
        <p class="helper" data-role="location-message">${escapeHtml(message)}</p>
      </section>
    </main>
  `;

  const gpsButton = root.querySelector<HTMLButtonElement>("[data-action='use-gps']");
  const input = root.querySelector<HTMLInputElement>("#city-search");
  const results = root.querySelector<HTMLDivElement>("#city-results");
  const status = root.querySelector<HTMLElement>("[data-role='location-message']");

  gpsButton?.addEventListener("click", async () => {
    gpsButton.disabled = true;
    setText(status, "Pedindo permissao para o navegador...");

    try {
      const location = await getBrowserLocation();
      saveSelectedLocation(location);
      await loadForecast(root, location, { forceRefresh: true });
    } catch {
      gpsButton.disabled = false;
      setText(status, "Sem crise. Digite sua cidade ai embaixo.");
      input?.focus();
    }
  });

  const runSearch = debounce(async (query: string) => {
    if (!results || !status || !input) return;

    searchState.controller?.abort();
    results.innerHTML = "";

    if (query.trim().length < 3) {
      root.querySelector(".search-box")?.setAttribute("aria-expanded", "false");
      setText(status, "Digite pelo menos 3 letras para buscar.");
      return;
    }

    const sequence = searchState.sequence + 1;
    searchState.sequence = sequence;
    searchState.controller = new AbortController();
    setText(status, "Buscando cidade...");

    try {
      const cities = await searchCities(query, { signal: searchState.controller.signal });
      if (sequence !== searchState.sequence) return;
      renderCityResults(root, results, cities);
      setText(
        status,
        cities.length > 0 ? "Escolha uma cidade da lista." : "Nao encontrei essa cidade.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setText(status, "Nao deu para buscar agora. Tenta de novo em instantes.");
    }
  }, 350);

  input?.addEventListener("input", () => runSearch(input.value));
}

function renderCityResults(
  root: HTMLElement,
  container: HTMLElement,
  cities: SelectedLocation[],
): void {
  root.querySelector(".search-box")?.setAttribute("aria-expanded", String(cities.length > 0));
  container.innerHTML = cities
    .map(
      (city, index) => `
        <button class="city-option" type="button" role="option" data-city-index="${index}">
          <span>${escapeHtml(city.displayName)}</span>
          <small>${round(city.latitude)}, ${round(city.longitude)}</small>
        </button>
      `,
    )
    .join("");

  container.querySelectorAll<HTMLButtonElement>("[data-city-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const city = cities[Number(button.dataset.cityIndex)];
      if (!city) return;
      saveSelectedLocation(city);
      await loadForecast(root, city, { forceRefresh: true });
    });
  });
}

async function loadForecast(
  root: HTMLElement,
  location: SelectedLocation,
  options: { forceRefresh?: boolean } = {},
): Promise<void> {
  const freshCache = options.forceRefresh ? null : getCachedForecast(location);

  if (freshCache) {
    renderResult(root, location, freshCache, { fromCache: true });
    return;
  }

  renderLoading(root, location);
  const staleCache = getCachedForecast(location, { allowStale: true });

  try {
    const forecast = await fetchForecastOnce(location);
    const cache = saveForecast(location, forecast);
    renderResult(root, location, cache, { fromCache: false });
  } catch {
    if (staleCache) {
      renderResult(root, location, staleCache, {
        fromCache: true,
        staleWarning: "Usando a ultima previsao salva.",
      });
      return;
    }

    renderWeatherError(root, location);
  }
}

function fetchForecastOnce(location: SelectedLocation): Promise<HourlyWeather[]> {
  if (forecastState.key === location.key && forecastState.promise) {
    return forecastState.promise;
  }

  forecastState.key = location.key;
  forecastState.promise = fetchWeatherForecast(location).finally(() => {
    forecastState.key = undefined;
    forecastState.promise = undefined;
  });

  return forecastState.promise;
}

function renderLoading(root: HTMLElement, location: SelectedLocation): void {
  root.innerHTML = `
    <main class="app-shell loading-view" aria-live="polite">
      <section class="result-card loading-card">
        <img class="brand-ball spin" src="${assetPath("favicon.svg")}" alt="" width="64" height="64" />
        <p class="eyebrow">Vai Dar Volei?</p>
        <h1>Consultando o ceu</h1>
        <p>Secando a areia em ${escapeHtml(location.displayName)}...</p>
      </section>
    </main>
  `;
}

function renderWeatherError(root: HTMLElement, location: SelectedLocation): void {
  root.innerHTML = `
    <main class="app-shell location-view">
      <section class="location-panel">
        <img class="brand-ball" src="${assetPath("favicon.svg")}" alt="" width="64" height="64" />
        <p class="eyebrow">Vai Dar Volei?</p>
        <h1>Hoje o sinal caiu.</h1>
        <p class="intro">Nao consegui buscar a previsao para ${escapeHtml(location.displayName)}.</p>
        <button class="primary-action" data-action="try-again" type="button">Tentar de novo</button>
        <button class="text-action" data-action="change-location" type="button">Trocar localizacao</button>
      </section>
    </main>
  `;

  root.querySelector("[data-action='try-again']")?.addEventListener("click", () => {
    void loadForecast(root, location, { forceRefresh: true });
  });
  root.querySelector("[data-action='change-location']")?.addEventListener("click", () => {
    clearSelectedLocation();
    renderLocationScreen(root);
  });
}

function renderResult(
  root: HTMLElement,
  location: SelectedLocation,
  cache: WeatherCache,
  options: { fromCache: boolean; staleWarning?: string },
): void {
  const verdict = createVerdict(cache.forecast);
  const scoredHours = scoreForecast(cache.forecast).filter((hour) => {
    const timestamp = hour.hour.timestamp.getTime();
    if (!verdict.playWindow) return timestamp >= currentForecastHour().getTime();
    return (
      timestamp >= verdict.playWindow.start.getTime() &&
      timestamp < verdict.playWindow.end.getTime()
    );
  });
  const toneClass = verdict.verdict.toLowerCase();

  root.innerHTML = `
    <main class="app-shell result-view ${toneClass}" aria-labelledby="app-title">
      <section class="result-card">
        <header class="result-header">
          <img class="brand-ball" src="${assetPath("favicon.svg")}" alt="" width="52" height="52" />
          <div>
            <p class="eyebrow">Vai Dar Volei?</p>
            <p class="location-name">${escapeHtml(location.displayName)}</p>
          </div>
        </header>

        ${options.staleWarning ? `<p class="warning" role="status">${escapeHtml(options.staleWarning)}</p>` : ""}

        <p class="verdict-dot" aria-label="${verdictLabel(verdict.verdict)}">${verdictIcon(verdict.verdict)}</p>
        <h1 id="app-title" class="verdict">${escapeHtml(verdict.phrase)}</h1>

        <div class="metric-row" aria-label="Resumo do clima">
          <span><strong>${round(verdict.averageTemperature)}C</strong><small>temp.</small></span>
          <span><strong>${round(verdict.maxRainProbability)}%</strong><small>chuva</small></span>
          <span><strong>${round(verdict.averageWindSpeed)}</strong><small>km/h</small></span>
        </div>

        <div class="best-window">
          <span>Proximas 2 horas</span>
          <strong>${verdict.playWindow ? formatHourRange(verdict.playWindow.start, verdict.playWindow.end) : "Sem janela"}</strong>
        </div>

        <p class="explanation">${escapeHtml(verdict.explanation)}</p>
        <p class="updated">${formatTimeAgo(cache.fetchedAt)}${options.fromCache && isCacheFresh(cache) ? " · cache ativo" : ""}</p>

        <div class="actions">
          <button class="secondary-action" data-action="toggle-details" type="button" aria-expanded="false">
            Ver detalhes
          </button>
          <button class="primary-action" data-action="share" type="button">Compartilhar</button>
        </div>

        <section class="details" hidden>
          <h2>Agora e proxima hora</h2>
          <div class="hour-list">
            ${renderHours(scoredHours)}
          </div>
        </section>

        <button class="text-action" data-action="change-location" type="button">Trocar localizacao</button>
        <p class="attribution">Dados meteorologicos por Open-Meteo.</p>
        <p class="helper" data-role="share-status" aria-live="polite"></p>
      </section>
    </main>
  `;

  const details = root.querySelector<HTMLElement>(".details");
  const detailsButton = root.querySelector<HTMLButtonElement>("[data-action='toggle-details']");
  const shareButton = root.querySelector<HTMLButtonElement>("[data-action='share']");
  const shareStatus = root.querySelector<HTMLElement>("[data-role='share-status']");

  detailsButton?.addEventListener("click", () => {
    if (!details || !detailsButton) return;
    const willOpen = details.hidden;
    details.hidden = !willOpen;
    detailsButton.setAttribute("aria-expanded", String(willOpen));
    detailsButton.textContent = willOpen ? "Ocultar detalhes" : "Ver detalhes";
  });

  shareButton?.addEventListener("click", async () => {
    shareButton.disabled = true;
    try {
      await shareVerdict(verdict, location);
      setText(shareStatus, "Copiado! Agora manda no grupo.");
    } catch {
      setText(shareStatus, "Nao consegui compartilhar agora.");
    } finally {
      shareButton.disabled = false;
    }
  });

  root.querySelector("[data-action='change-location']")?.addEventListener("click", () => {
    clearSelectedLocation();
    renderLocationScreen(root);
  });
}

function renderHours(hours: HourScore[]): string {
  if (hours.length === 0)
    return `<p class="empty">Nao tenho previsao suficiente para as proximas 2 horas.</p>`;

  return hours
    .slice(0, 12)
    .map(
      (hour) => `
        <article class="hour-card ${hour.rating.toLowerCase()}">
          <strong>${formatHour(hour.hour.timestamp)}</strong>
          <span>${verdictIcon(hour.rating)} ${verdictLabel(hour.rating)}</span>
          <small>${round(hour.hour.temperature)}C · ${round(hour.hour.precipitationProbability)}% chuva</small>
        </article>
      `,
    )
    .join("");
}

function verdictIcon(verdict: VolleyballVerdict["verdict"]): string {
  if (verdict === "GOOD") return "🟢";
  if (verdict === "MAYBE") return "🟡";
  return "🔴";
}

function verdictLabel(verdict: VolleyballVerdict["verdict"]): string {
  if (verdict === "GOOD") return "BOM";
  if (verdict === "MAYBE") return "TALVEZ";
  return "RUIM";
}

function assetPath(fileName: string): string {
  return `${import.meta.env.BASE_URL}${fileName}`;
}

function setText(element: Element | null | undefined, text: string): void {
  if (element) element.textContent = text;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
