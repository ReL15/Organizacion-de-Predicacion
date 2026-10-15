import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territory, PreachingPlace, PublicPreachingPlace, GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/googleGeocoding';
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

    // Calcular centro basado directamente en los territorios
    let centerPoint: [number, number] = initialCenter;
    const selectedTerr = territories.find((t) => t.id === selectedTerritoryId);
    const activePoints = selectedTerr?.polygon?.length
      ? selectedTerr.polygon
      : editingPolygonPoints?.length
      ? editingPolygonPoints
      : territories.find((t) => t.polygon?.length)?.polygon;

    if (activePoints && activePoints.length > 0) {
      const avgLat = activePoints.reduce((sum, p) => sum + p.latitude, 0) / activePoints.length;
      const avgLng = activePoints.reduce((sum, p) => sum + p.longitude, 0) / activePoints.length;
      centerPoint = [Number(avgLat.toFixed(6)), Number(avgLng.toFixed(6))];
    }

    const map = L.map(mapContainerRef.current, {
      center: centerPoint,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    // Capa de Google Maps (Calles)
    const googleRoadsLayer = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
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

    // Si no hay puntos trazados y hay ciudad configurada, usar centro referencial
    if ((!activePoints || activePoints.length === 0) && city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (!cancelled && center) map.setView([center.latitude, center.longitude], 14);
        })
        .catch(() => {
          // Ignorar silenciosamente
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
  }, [initialCenter]);

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
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Renderizar territorios y vértices puntuados con círculos perfectos sin deformación
  useEffect(() => {
    const map = mapRef.current;
    const polygonLayer = polygonLayerRef.current;
    const markerLayer = markerLayerRef.current;
    const editLayer = editLayerRef.current;
    if (!map || !polygonLayer || !markerLayer || !editLayer) return;

    polygonLayer.clearLayers();
    markerLayer.clearLayers();

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
          fillOpacity: isSelected ? 0.42 : 0.22,
        });

        const statusBg =
          territory.status === 'DISPONIBLE'
            ? '#ecfdf5'
            : territory.status === 'ASIGNADO'
            ? '#eff6ff'
            : territory.status === 'EN_PROCESO'
            ? '#fffbeb'
            : territory.status === 'COMPLETADO'
            ? '#f5f3ff'
            : '#f1f5f9';

        const statusTextColor =
          territory.status === 'DISPONIBLE'
            ? '#059669'
            : territory.status === 'ASIGNADO'
            ? '#2563eb'
            : territory.status === 'EN_PROCESO'
            ? '#d97706'
            : territory.status === 'COMPLETADO'
            ? '#7c3aed'
            : '#64748b';

        // Popup con información y detalles completos al hacer clic sobre la sección del mapa
        const popupContent = `
          <div style="font-size:12px;font-family:sans-serif;line-height:1.45;min-width:210px;padding:2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
              <strong style="font-size:14px;color:#0f172a;">Territorio #${territory.number}</strong>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${statusBg};color:${statusTextColor};">
                ${territory.status}
              </span>
            </div>
            ${territory.name ? `<div style="font-weight:600;color:#334155;margin-bottom:3px;font-size:12px;">${territory.name}</div>` : ''}
            ${
              territory.lastAssignedToName
                ? `
              <div style="color:#475569;margin-bottom:3px;font-size:11px;">
                <b>Asignado a:</b> ${territory.lastAssignedToName}
                ${territory.lastAssignedDate ? `<span style="color:#94a3b8;font-size:10px;"> (${territory.lastAssignedDate})</span>` : ''}
              </div>
            `
                : '<div style="color:#059669;font-weight:500;margin-bottom:3px;font-size:11px;">Disponible para asignación</div>'
            }
            ${
              territory.lastProgress
                ? `
              <div style="margin-top:6px;padding:5px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;color:#1e40af;">
                <div style="font-weight:700;font-size:11px;">📌 Dónde quedó:</div>
                <div style="margin-top:2px;font-size:11px;color:#1d4ed8;">${territory.lastProgress}</div>
                ${
                  territory.lastProgressDate || territory.lastProgressPublisher
                    ? `
                  <div style="font-size:10px;color:#3b82f6;margin-top:2px;">
                    ${territory.lastProgressDate || ''} ${
                        territory.lastProgressPublisher
                          ? `· por ${territory.lastProgressPublisher}`
                          : ''
                      }
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }
            ${
              territory.observations
                ? `
              <div style="margin-top:5px;color:#64748b;font-size:11px;font-style:italic;">
                Nota: ${territory.observations}
              </div>
            `
                : ''
            }
          </div>
        `;

        polygon.bindPopup(popupContent, { maxWidth: 280 });

        // Al hacer clic en la sección del mapa, abrir popup con detalles y seleccionar el territorio
        polygon.on('click', (e: L.LeafletMouseEvent) => {
          selectRef.current?.(territory.id);
          polygon.openPopup(e.latlng);
        });

        // Efecto visual hover para realzar la sección al pasar el ratón
        polygon.on('mouseover', () => {
          polygon.setStyle({
            fillOpacity: 0.48,
            weight: isSelected ? 4 : 2.5,
          });
        });
        polygon.on('mouseout', () => {
          polygon.setStyle({
            fillOpacity: isSelected ? 0.42 : 0.22,
            weight: isSelected ? 3.5 : 2,
          });
        });

        polygon.addTo(polygonLayer);

        if (isSelected) {
          targetBounds = polygon.getBounds();
        }
      } else if (polyPoints.length > 0 && polyPoints.length < 3) {
        // Si el territorio tiene solo 1 o 2 puntos trazados, mostrar un punto referencial
        polyPoints.forEach((pt, i) => {
          const marker = L.circleMarker([pt.latitude, pt.longitude], {
            radius: 6,
            fillColor: '#f59e0b',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
          }).bindPopup(`<b>Territorio #${territory.number}</b> (Punto ${i + 1} de trazado)`);
          marker.on('click', () => selectRef.current?.(territory.id));
          marker.addTo(polygonLayer);
          if (isSelected) {
            targetBounds = L.latLngBounds([[pt.latitude, pt.longitude]]);
          }
        });
      }
    });

    // Puntos de Salida (Lugares de predicación) -> Azul Oscuro
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        fillColor: '#1e3a8a', // Azul oscuro
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      });
      const popup = `
        <div style="font-size:12px;font-family:sans-serif;line-height:1.45;min-width:190px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1e3a8a;border:1.5px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.3);flex-shrink:0;"></span>
            <strong style="font-size:13px;color:#0f172a;">${place.name}</strong>
          </div>
          <div style="color:#1e40af;font-weight:600;font-size:11px;margin-bottom:2px;">
            Lugar de Predicación (Punto de Salida)
          </div>
          <div style="color:#475569;font-size:11px;">${place.address}</div>
          ${place.description ? `<div style="margin-top:4px;color:#64748b;font-size:11px;font-style:italic;">${place.description}</div>` : ''}
          <div style="margin-top:6px;padding-top:4px;border-top:1px solid #e2e8f0;">
            <a href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:none;font-weight:600;font-size:11px;display:inline-flex;align-items:center;gap:3px;">
              Ver en Google Maps &rarr;
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popup, { maxWidth: 260 }).addTo(markerLayer);
    });

    // Exhibidores públicos (Predicación pública) -> Morado
    publicPlaces.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        fillColor: '#7e22ce', // Morado
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      });
      const popup = `
        <div style="font-size:12px;font-family:sans-serif;line-height:1.45;min-width:190px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7e22ce;border:1.5px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.3);flex-shrink:0;"></span>
            <strong style="font-size:13px;color:#0f172a;">${place.name}</strong>
          </div>
          <div style="color:#7e22ce;font-weight:600;font-size:11px;margin-bottom:2px;">
            Predicación Pública (Exhibidores)
          </div>
          <div style="color:#475569;font-size:11px;"><b>Horario:</b> ${place.day} · ${place.time}</div>
          ${place.description ? `<div style="margin-top:4px;color:#64748b;font-size:11px;font-style:italic;">${place.description}</div>` : ''}
          <div style="margin-top:6px;padding-top:4px;border-top:1px solid #e2e8f0;">
            <a href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}" target="_blank" rel="noopener noreferrer" style="color:#7e22ce;text-decoration:none;font-weight:600;font-size:11px;display:inline-flex;align-items:center;gap:3px;">
              Ver en Google Maps &rarr;
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popup, { maxWidth: 260 }).addTo(markerLayer);
    });

    // Edición interactiva de polígono actual
    editLayer.clearLayers();
    if (isEditingPolygon && points.length > 0) {
      points.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 6,
          color: '#ffffff',
          fillColor: '#e11d48',
          weight: 2,
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

    // Auto-ajustar mapa a los límites del territorio seleccionado
    if (autoFitBounds && targetBounds && targetBounds.isValid()) {
      map.fitBounds(targetBounds, {
        padding: [50, 50],
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

      {/* Marca oficial de Google Maps */}
      <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2 py-1 rounded shadow-xs border border-slate-200/80 text-[11px]">
        <span className="font-bold tracking-tight text-slate-800 flex items-center">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
          <span className="ml-1 text-slate-700 font-semibold text-[10px]">Maps</span>
        </span>
        <span className="text-slate-400 text-[10px]">· Datos del mapa ©{new Date().getFullYear()} Google</span>
      </div>

      {/* Leyenda explicativa de colores */}
      <div className="absolute bottom-2 right-2 z-[1000] hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-slate-200 text-[11px] text-slate-700">
        <span className="flex items-center gap-1 font-medium text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] border border-white shadow-xs inline-block"></span>
          Lugares Predicación
        </span>
        <span className="flex items-center gap-1 font-medium text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7e22ce] border border-white shadow-xs inline-block"></span>
          Predicación Pública
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="w-3 h-2 rounded-xs bg-emerald-500/40 border border-emerald-600 inline-block"></span>
          Territorio (clic para ver detalles)
        </span>
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
