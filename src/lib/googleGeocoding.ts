import { GeoPoint } from '../types';

const CACHE_PREFIX = 'opc_google_geocode:';

// Coordenadas de referencia rápida para ciudades y países hispanohablantes comunes
const CITY_COORDINATES_FALLBACK: Record<string, GeoPoint> = {
  'santa tecla': { latitude: 13.674, longitude: -89.284 },
  'san salvador': { latitude: 13.6989, longitude: -89.1914 },
  'antiguo cuscatlan': { latitude: 13.6719, longitude: -89.2392 },
  'soyapango': { latitude: 13.7103, longitude: -89.1417 },
  'mejicanos': { latitude: 13.7408, longitude: -89.2131 },
  'santa ana': { latitude: 13.9942, longitude: -89.5597 },
  'san miguel': { latitude: 13.4833, longitude: -88.1833 },
  'sonsonate': { latitude: 13.7189, longitude: -89.7242 },
  'ahuachapan': { latitude: 13.9214, longitude: -89.845 },
  'usulutan': { latitude: 13.35, longitude: -88.45 },
  'zacatecoluca': { latitude: 13.5, longitude: -88.8667 },
  'cojutepeque': { latitude: 13.7214, longitude: -88.9358 },
  'san vicente': { latitude: 13.6333, longitude: -88.7833 },
  'chalatenango': { latitude: 14.0333, longitude: -88.9333 },
  'ciudad de guatemala': { latitude: 14.6349, longitude: -90.5069 },
  'guatemala': { latitude: 14.6349, longitude: -90.5069 },
  'tegucigalpa': { latitude: 14.0723, longitude: -87.1921 },
  'san pedro sula': { latitude: 15.5042, longitude: -88.025 },
  'managua': { latitude: 12.115, longitude: -86.2362 },
  'san jose': { latitude: 9.9281, longitude: -84.0907 },
  'panama': { latitude: 8.9824, longitude: -79.5199 },
  'bogota': { latitude: 4.711, longitude: -74.0721 },
  'medellin': { latitude: 6.2442, longitude: -75.5812 },
  'ciudad de mexico': { latitude: 19.4326, longitude: -99.1332 },
  'mexico': { latitude: 19.4326, longitude: -99.1332 },
  'buenos aires': { latitude: -34.6037, longitude: -58.3816 },
  'madrid': { latitude: 40.4168, longitude: -3.7038 },
};

/**
 * Busca las coordenadas GPS aproximadas de una ciudad o localidad para centrar mapas de Google Maps.
 */
export async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const query = city.trim().toLowerCase();
  if (!query) return null;

  const cacheKey = `${CACHE_PREFIX}${query}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as GeoPoint;
  } catch {
    // Continuar si sessionStorage no está disponible
  }

  // Buscar coincidencia en diccionario de localidades comunes
  for (const [key, coords] of Object.entries(CITY_COORDINATES_FALLBACK)) {
    if (query.includes(key) || key.includes(query)) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(coords));
      } catch {
        // Ignorar error de almacenamiento
      }
      return coords;
    }
  }

  // Si no se encuentra en el diccionario, usar centro por defecto de El Salvador / Centroamérica
  const defaultCoords: GeoPoint = { latitude: 13.674, longitude: -89.284 };
  return defaultCoords;
}
