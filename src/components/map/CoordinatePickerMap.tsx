import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/googleGeocoding';
import { Crosshair } from 'lucide-react';

interface CoordinatePickerMapProps {
  value: GeoPoint;
  onChange: (point: GeoPoint) => void;
  label?: string;
  city?: string;
  markerColor?: string; // Color personalizado para el marcador (ej: #1e3a8a o #7e22ce)
}

export const CoordinatePickerMap: React.FC<CoordinatePickerMapProps> = ({
  value,
  onChange,
  label = 'Selecciona la ubicación en el mapa haciendo clic',
  city,
  markerColor = '#1e3a8a',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const isUserInteractingRef = useRef(false);

  const [mapType, setMapType] = useState<'streets' | 'hybrid'>('streets');
  const [mapError, setMapError] = useState('');
  const [coordinateError, setCoordinateError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Función para crear el icono con el color configurado
  const createMarkerIcon = useCallback((color: string) => {
    return L.divIcon({
      className: '',
      html: `<span style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 3px 8px rgba(0,0,0,0.45);cursor:grab;"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }, []);

  // Función para centrar manualmente en la ubicación del marcador
  const handleCenterOnLocation = () => {
    const map = mapRef.current;
    if (!map) return;
    const hasCoords =
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      (value.latitude !== 0 || value.longitude !== 0);

    if (hasCoords) {
      map.setView([value.latitude, value.longitude], 16, { animate: true });
      map.invalidateSize();
    } else if (city?.trim()) {
      void geocodeCity(city).then((center) => {
        if (center && mapRef.current) {
          mapRef.current.setView([center.latitude, center.longitude], 15, { animate: true });
          mapRef.current.invalidateSize();
        }
      });
    }
  };

  // Inicialización del mapa
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const hasCoords =
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      (value.latitude !== 0 || value.longitude !== 0);

    const initialCenter: [number, number] = hasCoords
      ? [value.latitude, value.longitude]
      : [13.674, -89.284];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: hasCoords ? 16 : 14,
      zoomControl: true,
      attributionControl: false,
    });

    const googleLayer = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        attribution: '&copy; Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }
    ).addTo(map);

    tileLayerRef.current = googleLayer;

    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: createMarkerIcon(markerColor),
    });

    if (hasCoords) {
      marker.addTo(map);
    }

    marker.on('dragstart', () => {
      isUserInteractingRef.current = true;
    });

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = Number(position.lat.toFixed(6));
      const newLng = Number(position.lng.toFixed(6));
      onChangeRef.current({
        latitude: newLat,
        longitude: newLng,
      });
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 100);
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      isUserInteractingRef.current = true;
      marker.setLatLng(event.latlng);
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
      const newLat = Number(event.latlng.lat.toFixed(6));
      const newLng = Number(event.latlng.lng.toFixed(6));
      onChangeRef.current({
        latitude: newLat,
        longitude: newLng,
      });
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 100);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Si NO tiene coordenadas iniciales y hay una ciudad configurada, buscar centro de la ciudad
    if (!hasCoords && city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (cancelled || !center || !mapRef.current || !markerRef.current) return;
          mapRef.current.setView([center.latitude, center.longitude], 15);
          markerRef.current.setLatLng([center.latitude, center.longitude]).addTo(mapRef.current);
          onChangeRef.current({
            latitude: Number(center.latitude.toFixed(6)),
            longitude: Number(center.longitude.toFixed(6)),
          });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setMapError(error instanceof Error ? error.message : 'No se pudo buscar la ciudad.');
          }
        });
    }

    // Leaflet en modales: Forzar recalculación de dimensiones para evitar tiles grises o descentradas
    const timer1 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
        if (hasCoords) {
          mapRef.current.setView([value.latitude, value.longitude], 16);
        }
      }
    }, 60);

    const timer2 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
        if (hasCoords) {
          mapRef.current.setView([value.latitude, value.longitude], 16);
        }
      }
    }, 200);

    const timer3 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 450);

    // ResizeObserver para mantener el mapa siempre adaptado al contenedor del modal
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
    };
  }, [city, markerColor]);

  // Actualizar icono cuando cambia el color
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createMarkerIcon(markerColor));
    }
  }, [markerColor, createMarkerIcon]);

  // Sincronizar posición del marcador y enfocar el mapa cuando cambian las coordenadas
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const hasCoords =
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      (value.latitude !== 0 || value.longitude !== 0);

    if (!hasCoords) return;

    marker.setLatLng([value.latitude, value.longitude]);
    if (!map.hasLayer(marker)) {
      marker.addTo(map);
    }

    // Si el cambio no proviene de arrastre interactivo del usuario, centrar la vista en el punto
    if (!isUserInteractingRef.current) {
      const currentCenter = map.getCenter();
      const distance = currentCenter.distanceTo([value.latitude, value.longitude]);
      // Si la distancia al centro es mayor a 25 metros, reposicionar la cámara del mapa
      if (distance > 25) {
        map.setView([value.latitude, value.longitude], map.getZoom() || 16);
      }
      map.invalidateSize();
    }
  }, [value.latitude, value.longitude]);

  // Cambiar entre Calles y Satélite
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapType === 'hybrid'
        ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  const updateCoordinate = (coordinate: 'latitude' | 'longitude', rawValue: string) => {
    const parsed = Number(rawValue);
    const limit = coordinate === 'latitude' ? 90 : 180;
    if (rawValue.trim() === '' || !Number.isFinite(parsed) || Math.abs(parsed) > limit) {
      setCoordinateError(
        coordinate === 'latitude'
          ? 'La latitud debe estar entre -90 y 90.'
          : 'La longitud debe estar entre -180 y 180.'
      );
      return;
    }

    setCoordinateError('');
    const point = { ...value, [coordinate]: parsed };
    onChange(point);
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([point.latitude, point.longitude]);
      if (!mapRef.current.hasLayer(markerRef.current)) {
        markerRef.current.addTo(mapRef.current);
      }
      mapRef.current.panTo([point.latitude, point.longitude]);
    }
  };

  const hasValidPosition =
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    (value.latitude !== 0 || value.longitude !== 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600 font-medium">{label}</span>
        {hasValidPosition && (
          <button
            type="button"
            onClick={handleCenterOnLocation}
            className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 hover:underline"
            title="Centrar mapa en las coordenadas actuales"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Centrar en punto
          </button>
        )}
      </div>

      <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />

        {/* Botón flotante para centrar en el marcador */}
        {hasValidPosition && (
          <button
            type="button"
            onClick={handleCenterOnLocation}
            className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1 bg-white/95 hover:bg-white text-slate-800 px-2 py-1 rounded-md border border-slate-300 shadow-md text-[11px] font-semibold transition-all hover:scale-105"
            title="Centrar vista en el punto seleccionado"
          >
            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
            <span>Enfocar Punto</span>
          </button>
        )}

        {/* Selector de capa Calles / Satélite */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1 bg-white/95 p-1 rounded-md border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded ${
              mapType === 'streets' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Calles
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded ${
              mapType === 'hybrid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Satélite
          </button>
        </div>

        {/* Marca de Google Maps */}
        <div className="absolute bottom-1 right-1 z-[1000] rounded bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] text-slate-700 font-semibold shadow-xs border border-slate-200/80 flex items-center gap-1">
          <span className="font-bold tracking-tight text-slate-800 flex items-center">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
            <span className="ml-1 text-slate-700 font-semibold text-[9px]">Maps</span>
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Haz clic sobre Google Maps, arrastra el marcador o ajusta las coordenadas abajo.
      </p>

      {mapError && (
        <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
          {mapError} Puedes ingresar las coordenadas manualmente.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <label className="text-[11px] text-slate-600">
          Latitud GPS
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={value.latitude === 0 && value.longitude === 0 ? '' : value.latitude}
            onChange={(event) => updateCoordinate('latitude', event.target.value)}
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            required
          />
        </label>
        <label className="text-[11px] text-slate-600">
          Longitud GPS
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={value.latitude === 0 && value.longitude === 0 ? '' : value.longitude}
            onChange={(event) => updateCoordinate('longitude', event.target.value)}
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            required
          />
        </label>
      </div>

      {coordinateError && <p className="text-[11px] text-rose-700">{coordinateError}</p>}
    </div>
  );
};
