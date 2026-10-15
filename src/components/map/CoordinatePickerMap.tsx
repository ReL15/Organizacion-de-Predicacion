import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/googleGeocoding';

interface CoordinatePickerMapProps {
  value: GeoPoint;
  onChange: (point: GeoPoint) => void;
  label?: string;
  city?: string;
}

export const CoordinatePickerMap: React.FC<CoordinatePickerMapProps> = ({
  value,
  onChange,
  label = 'Selecciona la ubicación en el mapa haciendo clic',
  city,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  const [mapType, setMapType] = useState<'streets' | 'hybrid'>('streets');
  const [mapError, setMapError] = useState('');
  const [coordinateError, setCoordinateError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const hasValue = value.latitude !== 0 || value.longitude !== 0;
    const map = L.map(containerRef.current, {
      center: hasValue ? [value.latitude, value.longitude] : [13.674, -89.284],
      zoom: 15,
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

    const marker = L.marker(
      hasValue ? [value.latitude, value.longitude] : [13.674, -89.284],
      {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: '<span style="display:block;width:20px;height:20px;border:3px solid white;border-radius:50%;background:#2563eb;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></span>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }
    );

    if (hasValue) marker.addTo(map);

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onChangeRef.current({
        latitude: Number(position.lat.toFixed(6)),
        longitude: Number(position.lng.toFixed(6)),
      });
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng).addTo(map);
      onChangeRef.current({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;
    markerRef.current = marker;

    if (!hasValue && city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (cancelled || !center) return;
          map.setView([center.latitude, center.longitude], 15);
          marker.setLatLng([center.latitude, center.longitude]).addTo(map);
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

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
    };
  }, [city]);

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

  useEffect(() => {
    if (!markerRef.current || (value.latitude === 0 && value.longitude === 0)) return;
    markerRef.current.setLatLng([value.latitude, value.longitude]);
    if (mapRef.current && !mapRef.current.hasLayer(markerRef.current)) {
      markerRef.current.addTo(mapRef.current);
    }
  }, [value]);

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
      markerRef.current.setLatLng([point.latitude, point.longitude]).addTo(mapRef.current);
      mapRef.current.panTo([point.latitude, point.longitude]);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-slate-500">
        {label}. Haz clic sobre Google Maps, arrastra el marcador o escribe las coordenadas GPS.
      </span>

      <div className="relative w-full h-52 rounded-lg overflow-hidden border border-slate-200">
        <div ref={containerRef} className="w-full h-full" />

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

      {mapError && (
        <p className="text-[11px] text-amber-700">
          {mapError} Puedes ingresar las coordenadas manualmente.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] text-slate-600">
          Latitud GPS
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={value.latitude === 0 && value.longitude === 0 ? '' : value.latitude}
            onChange={(event) => updateCoordinate('latitude', event.target.value)}
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-xs"
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
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono text-xs"
            required
          />
        </label>
      </div>

      {coordinateError && <p className="text-[11px] text-rose-700">{coordinateError}</p>}
    </div>
  );
};
