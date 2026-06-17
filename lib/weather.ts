/**
 * Tiny weather-snapshot helper (server-side).
 *
 * Uses Open-Meteo — free, no API key, no auth — to grab a one-shot daily
 * snapshot for a date + location. We store this on a calendar entry so years
 * from now "it was 4°C and snowing the day we…" reads back as a tiny memory.
 *
 * Cheap by design: one fetch, only when an entry for *today* is first saved
 * (see app/api/calendar/route.ts), short timeout, fails silent.
 */

export interface WeatherSnapshot {
  /** WMO weather interpretation code. */
  code: number;
  /** Daily max / min in °C, rounded. */
  tempMaxC: number;
  tempMinC: number;
  emoji: string;
  label: string;
}

/** WMO weather code → emoji + human label. Grouped to the buckets people
 *  actually remember ("it rained", "it snowed") rather than all 28 codes. */
function describe(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "clear" };
  if (code <= 2) return { emoji: "🌤️", label: "mostly sunny" };
  if (code === 3) return { emoji: "☁️", label: "overcast" };
  if (code <= 48) return { emoji: "🌫️", label: "foggy" };
  if (code <= 57) return { emoji: "🌦️", label: "drizzle" };
  if (code <= 67) return { emoji: "🌧️", label: "rain" };
  if (code <= 77) return { emoji: "🌨️", label: "snow" };
  if (code <= 82) return { emoji: "🌧️", label: "rain showers" };
  if (code <= 86) return { emoji: "🌨️", label: "snow showers" };
  if (code <= 99) return { emoji: "⛈️", label: "thunderstorm" };
  return { emoji: "🌡️", label: "weather" };
}

/**
 * Fetch a daily snapshot for `date` (YYYY-MM-DD) at the given coordinates.
 * Returns null on any failure (bad coords, network, timeout, malformed) so
 * callers can treat weather as strictly best-effort.
 */
export async function fetchWeatherSnapshot(
  lat: number,
  lon: number,
  date: string,
): Promise<WeatherSnapshot | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&start_date=${date}&end_date=${date}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const daily = json?.daily;
    const code = daily?.weathercode?.[0];
    const max = daily?.temperature_2m_max?.[0];
    const min = daily?.temperature_2m_min?.[0];
    if (typeof code !== "number" || typeof max !== "number" || typeof min !== "number") {
      return null;
    }
    const { emoji, label } = describe(code);
    return { code, tempMaxC: Math.round(max), tempMinC: Math.round(min), emoji, label };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
