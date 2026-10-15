import { GeoPoint } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_PREFIX = 'opc_osm_geocode:';
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

export async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const query = city.trim();
  if (!query) return null;

  const cacheKey = `${CACHE_PREFIX}${query.toLocaleLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as GeoPoint;
  } catch {
    // Continue with a network lookup when browser storage is unavailable.
  }

  const request = requestQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = Date.now();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'es');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`El buscador de ciudades respondió con error ${response.status}.`);
    }
    const results: Array<{ lat: string; lon: string }> = await response.json();
    if (results.length === 0) {
      throw new Error(`No se encontró la ciudad "${query}".`);
    }

    const point = {
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon),
    };
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(point));
    } catch {
      // Geocoding still succeeds when browser storage is unavailable.
    }
    return point;
  });

  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}
