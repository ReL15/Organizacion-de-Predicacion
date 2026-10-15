import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territory, PreachingPlace, PublicPreachingPlace, GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/osmGeocoding';
import { Button } from '../common/Button';
import { RotateCcw, Layers, MapPin, Building2 } from 'lucide-react';

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
  kingdomHallLocation?: GeoPoint;
  heightClassName?: string;
  autoFitBounds?: boolean;
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
  kingdomHallLocation,
  heightClassName = 'h-[450px] md:h-[520px]',
  autoFitBounds = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const editLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'hybrid'>('streets');
  const [points, setPoints] = useState<GeoPoint[]>(editingPolygonPoints);
  const [mapError, setMapError] = useState('');

  const editStateRef = useRef({ isEditingPolygon, points, onPolygonChange });
  const selectRef = useRef(onSelectTerritory);

  useEffect(() => setPoints(editingPolygonPoints), [editingPolygonPoints]);
  useEffect(() => {
    editStateRef.current = { isEditingPolygon, points, onPolygonChange };
    selectRef.current = onSelectTerritory;
  }, [isEditingPolygon, points, onPolygonChange, onSelectTerritory]);

  // Inicializar mapa de Google Maps con Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    setMapError('');

    // Priorizar coordenadas del Salón del Reino si existen
    const centerPoint: [number, number] =
      kingdomHallLocation && kingdomHallLocation.latitude && kingdomHallLocation.longitude
        ? [kingdomHallLocation.latitude, kingdomHallLocation.longitude]
        : initialCenter;

    const map = L.map(mapContainerRef.current, {
      center: centerPoint,
      zoom: 15,
      zoomControl: true,
    });

    // Capa de Google Maps (Calles)
    const googleRoadsLayer = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      }
    );

    googleRoadsLayer.addTo(map);
    tileLayerRef.current = googleRoadsLayer;

    polygonLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    editLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Manejar clics para trazar polígonos
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

    // Si no hay Salón del Reino y hay ciudad configurada, buscar centro
    if (!kingdomHallLocation?.latitude && city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (!cancelled && center) map.setView([center.latitude, center.longitude], 14);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setMapError(error instanceof Error ? error.message : 'No se pudo ubicar la ciudad.');
          }
        });
    }

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      polygonLayerRef.current = null;
      editLayerRef.current = null;
    };
  }, [kingdomHallLocation?.latitude, kingdomHallLocation?.longitude, initialCenter]);

  // Cambiar entre capa de calles y satélite/híbrido de Google Maps
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

  // Renderizar territorios, vértices puntuados, lugares de reunión y Salón del Reino
  useEffect(() => {
    const map = mapRef.current;
    const polygonLayer = polygonLayerRef.current;
    const markerLayer = markerLayerRef.current;
    const editLayer = editLayerRef.current;
    if (!map || !polygonLayer || !markerLayer || !editLayer) return;

    polygonLayer.clearLayers();
    markerLayer.clearLayers();

    // 1. Salón del Reino de la Congregación
    if (kingdomHallLocation && kingdomHallLocation.latitude && kingdomHallLocation.longitude) {
      const khIcon = L.divIcon({
        className: 'custom-kh-icon',
        html: `
          <div style="background:#0f172a;color:#ffffff;padding:5px 8px;border-radius:8px;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap;">
            🏛️ Salón del Reino
          </div>
        `,
        iconAnchor: [60, 16],
      });

      L.marker([kingdomHallLocation.latitude, kingdomHallLocation.longitude], {
        icon: khIcon,
        zIndexOffset: 1000,
      })
        .bindPopup(`
          <div style="font-size:12px;font-family:sans-serif;">
            <strong style="font-size:13px;display:block;margin-bottom:2px;">🏛️ Salón del Reino</strong>
            <span>Ubicación oficial de la congregación</span>
          </div>
        `)
        .addTo(markerLayer);
    }

    // 2. Territorios y sus puntos exactamente puntuados
    let targetBounds: L.LatLngBounds | null = null;

    territories.forEach((territory) => {
      const isSelected = territory.id === selectedTerritoryId;
      const polyPoints = territory.polygon || [];

      // Si tiene al menos 3 puntos, trazar polígono perimetral
      if (polyPoints.length >= 3) {
        const colors = STATUS_COLORS[territory.status] || STATUS_COLORS.DISPONIBLE;
        const latLngs = polyPoints.map(
          ({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple
        );

        const polygon = L.polygon(latLngs, {
          color: isSelected ? '#0f172a' : colors.stroke,
          weight: isSelected ? 3.5 : 2,
          fillColor: colors.fill,
          fillOpacity: isSelected ? 0.45 : 0.25,
        });

        // Popup con información del territorio
        const popupContent = `
          <div style="font-size:12px;font-family:sans-serif;line-height:1.4;">
            <strong style="font-size:13px;display:block;">Territorio #${territory.number}${territory.name ? ` · ${territory.name}` : ''}</strong>
            <div style="margin-top:2px;color:#475569;"><b>Estado:</b> ${territory.status}</div>
            ${territory.lastAssignedToName ? `<div style="color:#475569;"><b>Asignado a:</b> ${territory.lastAssignedToName}</div>` : ''}
            ${territory.lastProgress ? `<div style="margin-top:4px;color:#1d4ed8;font-weight:600;">📌 Quedó: ${territory.lastProgress}</div>` : ''}
            ${territory.observations ? `<div style="margin-top:4px;color:#64748b;font-style:italic;">Nota: ${territory.observations}</div>` : ''}
          </div>
        `;
        polygon.bindPopup(popupContent);
        polygon.on('click', () => selectRef.current?.(territory.id));
        polygon.addTo(polygonLayer);

        // Etiqueta central del territorio
        const bounds = polygon.getBounds();
        const center = bounds.getCenter();
        const centerIcon = L.divIcon({
          className: 'custom-terr-label',
          html: `
            <div style="background:${isSelected ? '#0f172a' : 'rgba(15, 23, 42, 0.85)'};color:#fff;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;font-family:monospace;border:1.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.25);transform:translate(-50%, -50%);white-space:nowrap;">
              #${territory.number}
            </div>
          `,
          iconAnchor: [0, 0],
        });
        L.marker(center, { icon: centerIcon, interactive: false }).addTo(polygonLayer);

        // Guardar bounds si este es el territorio seleccionado
        if (isSelected) {
          targetBounds = bounds;
        }
      }

      // Vértices / Puntos Puntuados del Territorio:
      // Se muestran todos los puntos para que se aprecie exactamente dónde está puntuado
      polyPoints.forEach((point, idx) => {
        const isSel = territory.id === selectedTerritoryId;
        const vertexMarker = L.circleMarker([point.latitude, point.longitude], {
          radius: isSel ? 6 : 4,
          fillColor: isSel ? '#f59e0b' : '#38bdf8',
          color: '#ffffff',
          weight: isSel ? 2 : 1.5,
          fillOpacity: 1,
        });

        vertexMarker.bindTooltip(
          `<b>Territorio #${territory.number}</b> · Vértice ${idx + 1}<br/><span style="font-size:10px;color:#64748b;">${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</span>`
        );
        vertexMarker.on('click', () => selectRef.current?.(territory.id));
        vertexMarker.addTo(polygonLayer);
      });

      // Si solo tiene 1 o 2 puntos (no cerró polígono aún), mostrar un marcador visible
      if (polyPoints.length > 0 && polyPoints.length < 3) {
        polyPoints.forEach((pt, i) => {
          const pin = L.marker([pt.latitude, pt.longitude]).bindPopup(
            `<b>Territorio #${territory.number}</b> (Punto ${i + 1} de trazado)`
          );
          pin.addTo(polygonLayer);
          if (isSelected) {
            targetBounds = L.latLngBounds([[pt.latitude, pt.longitude]]);
          }
        });
      }
    });

    // 3. Puntos de Salida (Preaching Places)
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 6,
        fillColor: '#1e293b',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      });
      const popup = `
        <div style="font-size:12px;font-family:sans-serif;">
          <strong>${place.name}</strong>
          <div style="color:#64748b;">Lugar de salida · ${place.address}</div>
        </div>
      `;
      marker.bindPopup(popup).addTo(markerLayer);
    });

    // 4. Exhibidores públicos
    publicPlaces.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 6,
        fillColor: '#0284c7',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      });
      const popup = `
        <div style="font-size:12px;font-family:sans-serif;">
          <strong>${place.name}</strong>
          <div style="color:#64748b;">Exhibidores · ${place.day} · ${place.time}</div>
        </div>
      `;
      marker.bindPopup(popup).addTo(markerLayer);
    });

    // 5. Edición interactiva de polígono actual
    editLayer.clearLayers();
    if (isEditingPolygon && points.length > 0) {
      points.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 6,
          color: '#e11d48',
          fillColor: '#fff',
          weight: 2.5,
          fillOpacity: 1,
        })
          .bindTooltip(`Punto ${index + 1}`)
          .addTo(editLayer);
      });

      if (points.length >= 3) {
        const editPoly = L.polygon(
          points.map(({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple),
          {
            color: '#e11d48',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#fda4af',
            fillOpacity: 0.35,
          }
        ).addTo(editLayer);

        targetBounds = editPoly.getBounds();
      } else if (points.length > 0) {
        targetBounds = L.latLngBounds(
          points.map(({ latitude, longitude }) => [latitude, longitude])
        );
      }
    }

    // Auto-ajustar mapa a los límites del territorio seleccionado para que se vea exactamente donde está puntuado
    if (autoFitBounds && targetBounds && targetBounds.isValid()) {
      map.fitBounds(targetBounds, {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    }
  }, [
    territories,
    places,
    publicPlaces,
    selectedTerritoryId,
    isEditingPolygon,
    points,
    kingdomHallLocation?.latitude,
    kingdomHallLocation?.longitude,
    autoFitBounds,
  ]);

  const handleResetPoints = () => {
    setPoints([]);
    onPolygonChange?.([]);
  };

  return (
    <div
      className={`relative w-full ${heightClassName} rounded-xl overflow-hidden border border-slate-200 shadow-xs`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Controles flotantes sobre el mapa */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={() => setMapType('streets')}
          className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
            mapType === 'streets'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Calles
        </button>
        <button
          type="button"
          onClick={() => setMapType('hybrid')}
          className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
            mapType === 'hybrid'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Satélite
        </button>
      </div>

      {/* Marca de Google Maps */}
      <div className="absolute bottom-1 left-2 z-[1000] pointer-events-none text-[10px] text-slate-700 bg-white/80 px-1.5 py-0.5 rounded font-sans font-semibold">
        Google Maps
      </div>

      {mapError && (
        <div className="absolute top-3 left-3 z-[1000] rounded-lg bg-amber-50/95 border border-amber-200 px-3 py-2 text-xs text-amber-800 shadow-sm max-w-sm">
          {mapError} Puedes explorar el mapa y marcar directamente.
        </div>
      )}

      {/* Barra de estado en modo edición de polígono */}
      {isEditingPolygon && (
        <div className="absolute top-3 left-3 right-auto w-72 bg-white/95 backdrop-blur-xs p-3 rounded-lg shadow-md border border-slate-200 z-[1000]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-900">
              Puntuación del Territorio
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-bold">
              {points.length} puntos
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-tight">
            Haz clic sobre Google Maps para colocar cada vértice del territorio (mínimo 3 puntos).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPoints}
            disabled={points.length === 0}
            className="text-xs py-1 h-7 w-full justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reiniciar puntos
          </Button>
        </div>
      )}
    </div>
  );
};
