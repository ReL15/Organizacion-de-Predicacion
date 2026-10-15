import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoPoint } from '../../types';

interface CoordinatePickerMapProps {
  value: GeoPoint;
  onChange: (point: GeoPoint) => void;
  label?: string;
}

export const CoordinatePickerMap: React.FC<CoordinatePickerMapProps> = ({
  value,
  onChange,
  label = 'Selecciona la ubicación en el mapa haciendo clic',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const center: [number, number] = [value.latitude || 13.674, value.longitude || -89.284];
      const map = L.map(containerRef.current, {
        center,
        zoom: 15,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(center, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange({
          latitude: Number(pos.lat.toFixed(6)),
          longitude: Number(pos.lng.toFixed(6)),
        });
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        onChange({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && value.latitude && value.longitude) {
      markerRef.current.setLatLng([value.latitude, value.longitude]);
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200">
        <div ref={containerRef} className="w-full h-full" />
      </div>
      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 tabular-nums">
        <span>Lat: {value.latitude.toFixed(6)}</span>
        <span>Lng: {value.longitude.toFixed(6)}</span>
      </div>
    </div>
  );
};
