import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Territory, PreachingPlace, PublicPreachingPlace, GeoPoint } from '../../types';
import { Button } from '../common/Button';
import { MapPin, RotateCcw, Check, Plus, Layers } from 'lucide-react';

// Fix leaflet icon default assets in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  DISPONIBLE: { fill: '#10b981', stroke: '#059669' }, // verde esmeralda
  ASIGNADO: { fill: '#3b82f6', stroke: '#2563eb' }, // azul
  EN_PROCESO: { fill: '#f59e0b', stroke: '#d97706' }, // ámbar
  COMPLETADO: { fill: '#8b5cf6', stroke: '#7c3aed' }, // violeta
  INACTIVO: { fill: '#94a3b8', stroke: '#64748b' }, // gris
};

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  places = [],
  publicPlaces = [],
  selectedTerritoryId,
  onSelectTerritory,
  isEditingPolygon = false,
  editingPolygonPoints = [],
  onPolygonChange,
  initialCenter = [13.674, -89.284],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<{ [key: string]: L.Polygon }>({});
  const markerLayersRef = useRef<L.LayerGroup | null>(null);
  const editingLayerRef = useRef<L.LayerGroup | null>(null);

  const [points, setPoints] = useState<GeoPoint[]>(editingPolygonPoints);

  useEffect(() => {
    setPoints(editingPolygonPoints);
  }, [editingPolygonPoints]);

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: true,
      });

      // Capa OpenStreetMap con atribución obligatoria visible
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> colaboradores',
        maxZoom: 19,
      }).addTo(map);

      markerLayersRef.current = L.layerGroup().addTo(map);
      editingLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Manejar modo de edición de polígono con clics en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isEditingPolygon || !onPolygonChange) return;

      const newPoint: GeoPoint = {
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      };

      const updated = [...points, newPoint];
      setPoints(updated);
      onPolygonChange(updated);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isEditingPolygon, points, onPolygonChange]);

  // Renderizar polígonos de territorios existentes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpiar polígonos previos
    Object.values(polygonLayersRef.current).forEach((p) => map.removeLayer(p));
    polygonLayersRef.current = {};

    territories.forEach((t) => {
      if (!t.polygon || t.polygon.length < 3) return;

      const latLngs: L.LatLngExpression[] = t.polygon.map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);

      const colors = STATUS_COLORS[t.status] || STATUS_COLORS.DISPONIBLE;
      const isSelected = t.id === selectedTerritoryId;

      const poly = L.polygon(latLngs, {
        color: isSelected ? '#0f172a' : colors.stroke,
        weight: isSelected ? 3 : 2,
        fillColor: colors.fill,
        fillOpacity: isSelected ? 0.45 : 0.25,
      });

      poly.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <b style="font-size: 13px;">Territorio #${t.number}</b> ${t.name ? `· ${t.name}` : ''}<br />
          <span style="color: #64748b;">Estado:</span> <b>${t.status}</b><br />
          ${t.lastAssignedToName ? `<span style="color: #64748b;">Asignado a:</span> ${t.lastAssignedToName}<br />` : ''}
          ${t.description ? `<p style="margin-top: 4px; color: #475569;">${t.description}</p>` : ''}
        </div>
      `);

      poly.on('click', () => {
        if (!isEditingPolygon && onSelectTerritory) {
          onSelectTerritory(t.id);
        }
      });

      poly.addTo(map);
      polygonLayersRef.current[t.id] = poly;
    });
  }, [territories, selectedTerritoryId, isEditingPolygon, onSelectTerritory]);

  // Renderizar marcadores de lugares de salida y predicación pública
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markerLayersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Lugares de salida
    places.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: 6,
        fillColor: '#1e293b',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
      });

      marker.bindPopup(`
        <div style="font-size: 12px;">
          <b>${p.name}</b><br />
          <span style="color: #64748b;">Punto de Salida</span><br />
          <small>${p.address}</small>
        </div>
      `);
      group.addLayer(marker);
    });

    // Puntos de carritos
    publicPlaces.forEach((pp) => {
      if (!pp.latitude || !pp.longitude) return;

      const cartMarker = L.circleMarker([pp.latitude, pp.longitude], {
        radius: 6,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
      });

      cartMarker.bindPopup(`
        <div style="font-size: 12px;">
          <b>${pp.name}</b><br />
          <span style="color: #0284c7; font-weight: 600;">Punto de Carrito</span><br />
          <small>${pp.day} · ${pp.time} (${pp.duration}m)</small>
        </div>
      `);
      group.addLayer(cartMarker);
    });
  }, [places, publicPlaces]);

  // Renderizar polígono en edición activa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = editingLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (isEditingPolygon && points.length > 0) {
      // Dibujar marcadores para cada vértice
      points.forEach((pt, index) => {
        const marker = L.circleMarker([pt.latitude, pt.longitude], {
          radius: 5,
          color: '#e11d48',
          fillColor: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        });
        marker.bindTooltip(`Vértice ${index + 1}`, { permanent: false });
        layer.addLayer(marker);
      });

      if (points.length >= 3) {
        const latLngs: L.LatLngExpression[] = points.map((p) => [p.latitude, p.longitude]);
        const poly = L.polygon(
          latLngs,
          {
            color: '#e11d48',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#fda4af',
            fillOpacity: 0.35,
          }
        );
        layer.addLayer(poly);
      }
    }
  }, [isEditingPolygon, points]);

  const handleResetPoints = () => {
    setPoints([]);
    if (onPolygonChange) onPolygonChange([]);
  };

  return (
    <div className="relative w-full h-[450px] md:h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Barra de control para edición de límites */}
      {isEditingPolygon && (
        <div className="absolute top-3 left-3 right-3 md:left-auto md:right-3 md:w-80 bg-white/95 backdrop-blur-xs p-3 rounded-lg shadow-md border border-slate-200 z-1000">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-900">
              Editor de Límites del Territorio
            </span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {points.length} {points.length === 1 ? 'punto' : 'puntos'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            Haz clic en el mapa para marcar los vértices perimetrales del territorio (mínimo 3 puntos).
          </p>
          <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="absolute bottom-6 left-3 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-lg shadow-xs border border-slate-200 text-[11px] z-1000 hidden sm:flex items-center gap-3">
        <span className="font-medium text-slate-700">Estados:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Asignado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          En Proceso
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          Completado
        </span>
      </div>
    </div>
  );
};
