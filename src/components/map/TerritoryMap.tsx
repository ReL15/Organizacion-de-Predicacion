import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territory, PreachingPlace, PublicPreachingPlace, GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/osmGeocoding';
import { Button } from '../common/Button';
import { RotateCcw } from 'lucide-react';

interface TerritoryMapProps {
  territories: Territory[];
  places?: PreachingPlace[];
  publicPlaces?: PublicPreachingPlace[];
  selectedTerritoryId?: string;
  onSelectTerritory?: (id: string) => void;
  isEditingPolygon?: boolean;
  editingPolygonPoints?: GeoPoint[];
  onPolygonChange?: (points: GeoPoint[]) => void;
  initialCenter?: [number, number];
  city?: string;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  DISPONIBLE: { fill: '#10b981', stroke: '#059669' },
  ASIGNADO: { fill: '#3b82f6', stroke: '#2563eb' },
  EN_PROCESO: { fill: '#f59e0b', stroke: '#d97706' },
  COMPLETADO: { fill: '#8b5cf6', stroke: '#7c3aed' },
  INACTIVO: { fill: '#94a3b8', stroke: '#64748b' },
};
const DEFAULT_MAP_CENTER: [number, number] = [13.674, -89.284];

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  places = [],
  publicPlaces = [],
  selectedTerritoryId,
  onSelectTerritory,
  isEditingPolygon = false,
  editingPolygonPoints = [],
  onPolygonChange,
  initialCenter = DEFAULT_MAP_CENTER,
  city,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const editLayerRef = useRef<L.LayerGroup | null>(null);
  const [points, setPoints] = useState<GeoPoint[]>(editingPolygonPoints);
  const [mapError, setMapError] = useState('');
  const editStateRef = useRef({ isEditingPolygon, points, onPolygonChange });
  const selectRef = useRef(onSelectTerritory);

  useEffect(() => setPoints(editingPolygonPoints), [editingPolygonPoints]);
  useEffect(() => {
    editStateRef.current = { isEditingPolygon, points, onPolygonChange };
    selectRef.current = onSelectTerritory;
  }, [isEditingPolygon, points, onPolygonChange, onSelectTerritory]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    setMapError('');
    const map = L.map(mapContainerRef.current, { center: initialCenter, zoom: 14 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    editLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('click', (event: L.LeafletMouseEvent) => {
      const state = editStateRef.current;
      if (!state.isEditingPolygon || !state.onPolygonChange) return;
      const point = {
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      };
      const updated = [...state.points, point];
      setPoints(updated);
      state.onPolygonChange(updated);
    });

    if (city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (!cancelled && center) map.setView([center.latitude, center.longitude], 14);
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
      markerLayerRef.current = null;
      editLayerRef.current = null;
    };
  }, [city, initialCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    const editLayer = editLayerRef.current;
    if (!map || !markerLayer || !editLayer) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) map.removeLayer(layer);
    });

    territories.forEach((territory) => {
      if (!territory.polygon || territory.polygon.length < 3) return;
      const colors = STATUS_COLORS[territory.status] || STATUS_COLORS.DISPONIBLE;
      const polygon = L.polygon(
        territory.polygon.map(({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple),
        {
          color: territory.id === selectedTerritoryId ? '#0f172a' : colors.stroke,
          weight: territory.id === selectedTerritoryId ? 3 : 2,
          fillColor: colors.fill,
          fillOpacity: territory.id === selectedTerritoryId ? 0.45 : 0.25,
        }
      );
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `Territorio #${territory.number}${territory.name ? ` · ${territory.name}` : ''}`;
      const status = document.createElement('div');
      status.textContent = `Estado: ${territory.status}`;
      popup.append(title, status);
      polygon.bindPopup(popup);
      polygon.on('click', () => selectRef.current?.(territory.id));
      polygon.addTo(map);
    });

    markerLayer.clearLayers();
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 6, fillColor: '#1e293b', color: '#fff', weight: 2, fillOpacity: 0.9,
      });
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = place.name;
      const address = document.createElement('div');
      address.textContent = `Lugar de salida · ${place.address}`;
      popup.append(name, address);
      marker.bindPopup(popup).addTo(markerLayer);
    });
    publicPlaces.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 6, fillColor: '#0284c7', color: '#fff', weight: 2, fillOpacity: 0.9,
      });
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = place.name;
      const schedule = document.createElement('div');
      schedule.textContent = `Punto de exhibidores · ${place.day} · ${place.time}`;
      popup.append(name, schedule);
      marker.bindPopup(popup).addTo(markerLayer);
    });

    editLayer.clearLayers();
    if (isEditingPolygon && points.length > 0) {
      points.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 5, color: '#e11d48', fillColor: '#fff', weight: 2, fillOpacity: 1,
        }).bindTooltip(`Vértice ${index + 1}`).addTo(editLayer);
      });
      if (points.length >= 3) {
        L.polygon(
          points.map(({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple),
          {
          color: '#e11d48', weight: 2, dashArray: '4, 4', fillColor: '#fda4af', fillOpacity: 0.35,
          }
        ).addTo(editLayer);
      }
    }
  }, [territories, places, publicPlaces, selectedTerritoryId, isEditingPolygon, points]);

  const handleResetPoints = () => {
    setPoints([]);
    onPolygonChange?.([]);
  };

  return (
    <div className="relative w-full h-[450px] md:h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {mapError && (
        <div className="absolute top-2 left-2 z-[1000] rounded bg-amber-50/95 px-3 py-2 text-xs text-amber-800">
          {mapError} El mapa sigue disponible; puedes usar las coordenadas GPS.
        </div>
      )}
      {isEditingPolygon && (
        <div className="absolute top-3 left-3 right-3 md:left-auto md:right-3 md:w-80 bg-white/95 backdrop-blur-xs p-3 rounded-lg shadow-md border border-slate-200 z-[1000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-900">Editor de Límites del Territorio</span>
            <span className="text-[11px] font-mono text-slate-500">{points.length} puntos</span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            Haz clic en el mapa para marcar los vértices (mínimo 3 puntos).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPoints}
            disabled={points.length === 0}
            className="text-xs py-1 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reiniciar
          </Button>
        </div>
      )}
    </div>
  );
};
