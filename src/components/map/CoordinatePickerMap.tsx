import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/osmGeocoding';

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
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
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
      zoom: 14,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker(
      hasValue ? [value.latitude, value.longitude] : [13.674, -89.284],
      {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#2563eb;box-shadow:0 1px 5px #334155"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
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
          map.setView([center.latitude, center.longitude], 14);
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
      markerRef.current = null;
    };
  }, [city]);

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
        {label}. Haz clic, arrastra el marcador o escribe las coordenadas GPS.
      </span>
      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200">
        <div ref={containerRef} className="w-full h-full" />
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-1 z-[1000] rounded bg-white/90 px-1 text-[10px] text-slate-600"
        >
          © OpenStreetMap
        </a>
      </div>
      {mapError && <p className="text-[11px] text-amber-700">{mapError} Puedes ingresar las coordenadas manualmente.</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] text-slate-600">
          Latitud
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={value.latitude === 0 && value.longitude === 0 ? '' : value.latitude}
            onChange={(event) => updateCoordinate('latitude', event.target.value)}
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
            required
          />
        </label>
        <label className="text-[11px] text-slate-600">
          Longitud
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={value.latitude === 0 && value.longitude === 0 ? '' : value.longitude}
            onChange={(event) => updateCoordinate('longitude', event.target.value)}
            className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
            required
          />
        </label>
      </div>
      {coordinateError && <p className="text-[11px] text-rose-700">{coordinateError}</p>}
    </div>
  );
};
