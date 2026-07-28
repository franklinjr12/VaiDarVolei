export type LocationType = "gps" | "city";

export interface SelectedLocation {
  type: LocationType;
  key: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface HourlyWeather {
  timestamp: Date;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
}

export type Verdict = "GOOD" | "MAYBE" | "BAD";

export interface HourScore {
  hour: HourlyWeather;
  score: number;
  rating: Verdict;
  unsafeWeather: boolean;
  reasons: string[];
}

export interface PlayingWindow {
  start: Date;
  end: Date;
  hours: HourScore[];
  averageScore: number;
  thunderstorm: boolean;
  unsafeWeather: boolean;
}

export interface VolleyballVerdict {
  verdict: Verdict;
  score: number;
  phrase: string;
  explanation: string;
  bestWindow?: {
    start: Date;
    end: Date;
  };
  averageTemperature: number;
  maxRainProbability: number;
  averageWindSpeed: number;
  thunderstorm: boolean;
  noWindow: boolean;
}
