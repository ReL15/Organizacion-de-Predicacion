import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Territory, PreachingPlace, PublicPreachingPlace, GeoPoint } from '../../types';
import { geocodeCity } from '../../lib/googleGeocoding';
import { Button } from '../common/Button';
import { RotateCcw, Undo2, Trash2, Magnet, Maximize2, Minimize2 } from 'lucide-react';

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

// Paleta de colores distintivos y armoniosos para cada territorio
const DISTINCT_TERRITORY_PALETTE: { fill: string; stroke: string; name: string }[] = [
  { fill: '#3b82f6', stroke: '#1d4ed8', name: 'Azul' },         // Azul
  { fill: '#10b981', stroke: '#047857', name: 'Esmeralda' },    // Verde esmeralda
  { fill: '#f59e0b', stroke: '#b45309', name: 'Ámbar' },        // Ámbar
  { fill: '#8b5cf6', stroke: '#6d28d9', name: 'Violeta' },      // Violeta
  { fill: '#ec4899', stroke: '#be185d', name: 'Rosa' },         // Rosa
  { fill: '#06b6d4', stroke: '#0e7490', name: 'Cian' },         // Cian
  { fill: '#f97316', stroke: '#c2410c', name: 'Naranja' },      // Naranja
  { fill: '#14b8a6', stroke: '#0f766e', name: 'Turquesa' },     // Turquesa
  { fill: '#a855f7', stroke: '#7e22ce', name: 'Púrpura' },      // Púrpura
  { fill: '#6366f1', stroke: '#4338ca', name: 'Índigo' },       // Índigo
  { fill: '#84cc16', stroke: '#4d7c0f', name: 'Lima' },         // Lima
  { fill: '#eab308', stroke: '#a16207', name: 'Dorado' },       // Dorado
  { fill: '#0284c7', stroke: '#0369a1', name: 'Azul Cielo' },   // Azul cielo
  { fill: '#d946ef', stroke: '#a21caf', name: 'Fucsia' },       // Fucsia
  { fill: '#16a34a', stroke: '#15803d', name: 'Verde' },        // Verde
  { fill: '#e11d48', stroke: '#be123c', name: 'Carmesí' },      // Carmesí
];

function getTerritoryColors(territoryNumber: string, index: number) {
  const num = parseInt(territoryNumber.replace(/\D/g, ''), 10);
  const colorIndex =
    !isNaN(num) && num > 0
      ? (num - 1) % DISTINCT_TERRITORY_PALETTE.length
      : index % DISTINCT_TERRITORY_PALETTE.length;
  return DISTINCT_TERRITORY_PALETTE[colorIndex];
}

const DEFAULT_MAP_CENTER: [number, number] = [13.674, -89.284];

// Proyección ortogonal de punto a segmento en coordenadas de pantalla (píxeles)
function projectPointToSegment(
  p: L.LatLng,
  a: L.LatLng,
  b: L.LatLng,
  map: L.Map
): { point: L.LatLng; pixelDistance: number } {
  const pPx = map.latLngToLayerPoint(p);
  const aPx = map.latLngToLayerPoint(a);
  const bPx = map.latLngToLayerPoint(b);

  const dx = bPx.x - aPx.x;
  const dy = bPx.y - aPx.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { point: a, pixelDistance: pPx.distanceTo(aPx) };
  }

  let t = ((pPx.x - aPx.x) * dx + (pPx.y - aPx.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projPx = L.point(aPx.x + t * dx, aPx.y + t * dy);
  const projLatLng = map.layerPointToLatLng(projPx);

  return { point: projLatLng, pixelDistance: pPx.distanceTo(projPx) };
}

// Cálculo de ajuste magnético (Snapping) contra vértices y bordes de territorios vecinos
function calculateSnappedLatLng(
  latlng: L.LatLng,
  neighborTerritories: Territory[],
  currentTerritoryId: string | undefined,
  map: L.Map,
  thresholdPixels = 18
): { lat: number; lng: number; isSnapped: boolean; info?: string } {
  let bestPoint: L.LatLng = latlng;
  let minPixelDist = thresholdPixels;
  let snappedInfo = '';

  const clickPx = map.latLngToLayerPoint(latlng);

  neighborTerritories.forEach((t) => {
    if (t.id === currentTerritoryId || !t.polygon || t.polygon.length === 0) return;

    // 1. Prioridad: Vértices exactos del territorio vecino
    t.polygon.forEach((v, vIdx) => {
      const vLatLng = L.latLng(v.latitude, v.longitude);
      const vPx = map.latLngToLayerPoint(vLatLng);
      const pxDist = clickPx.distanceTo(vPx);

      if (pxDist < minPixelDist) {
        minPixelDist = pxDist;
        bestPoint = vLatLng;
        snappedInfo = `Ajustado a vértice #${vIdx + 1} del Territorio #${t.number}`;
      }
    });

    // 2. Si no cayó sobre un vértice, buscar si está pegado al borde (segmento de calle)
    if (minPixelDist === thresholdPixels && t.polygon.length >= 2) {
      for (let i = 0; i < t.polygon.length; i++) {
        const p1 = L.latLng(t.polygon[i].latitude, t.polygon[i].longitude);
        const nextIdx = (i + 1) % t.polygon.length;
        const p2 = L.latLng(t.polygon[nextIdx].latitude, t.polygon[nextIdx].longitude);

        const { point: projPoint, pixelDistance } = projectPointToSegment(latlng, p1, p2, map);

        if (pixelDistance < minPixelDist) {
          minPixelDist = pixelDistance;
          bestPoint = projPoint;
          snappedInfo = `Alineado al límite del Territorio #${t.number}`;
        }
      }
    }
  });

  const isSnapped = minPixelDist < thresholdPixels;
  return {
    lat: Number(bestPoint.lat.toFixed(6)),
    lng: Number(bestPoint.lng.toFixed(6)),
    isSnapped,
    info: snappedInfo,
  };
}

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
  const snapIndicatorLayerRef = useRef<L.LayerGroup | null>(null);
  const hasInitialFitRef = useRef(false);

  const [mapType, setMapType] = useState<'streets' | 'hybrid'>('streets');
  const [points, setPoints] = useState<GeoPoint[]>(editingPolygonPoints);
  const [mapError, setMapError] = useState('');
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [snapFeedback, setSnapFeedback] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editStateRef = useRef({ isEditingPolygon, points, onPolygonChange, snappingEnabled });
  const selectRef = useRef(onSelectTerritory);
  const territoriesRef = useRef(territories);

  useEffect(() => {
    setPoints(editingPolygonPoints);
  }, [editingPolygonPoints]);

  useEffect(() => {
    editStateRef.current = { isEditingPolygon, points, onPolygonChange, snappingEnabled };
    selectRef.current = onSelectTerritory;
    territoriesRef.current = territories;
  }, [isEditingPolygon, points, onPolygonChange, onSelectTerritory, territories, snappingEnabled]);

  // Inicializar mapa de Google Maps con Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    setMapError('');
    hasInitialFitRef.current = false;

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
    snapIndicatorLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Clic en el fondo del mapa
    map.on('click', (event: L.LeafletMouseEvent) => {
      const state = editStateRef.current;
      if (state.isEditingPolygon && state.onPolygonChange) {
        // En modo edición: Añadir punto con Snapping Magnético inteligente
        let newLat = Number(event.latlng.lat.toFixed(6));
        let newLng = Number(event.latlng.lng.toFixed(6));

        if (state.snappingEnabled && mapRef.current) {
          const snapped = calculateSnappedLatLng(
            event.latlng,
            territoriesRef.current,
            selectedTerritoryId,
            mapRef.current
          );
          if (snapped.isSnapped) {
            newLat = snapped.lat;
            newLng = snapped.lng;
            setSnapFeedback(snapped.info || 'Ajustado al límite vecino');
            setTimeout(() => setSnapFeedback(null), 2500);
          }
        }

        const newPoint = { latitude: newLat, longitude: newLng };
        const updated = [...state.points, newPoint];
        setPoints(updated);
        state.onPolygonChange(updated);
      } else {
        // En modo exploración general: Clic en el fondo del mapa deselecciona cualquier territorio
        selectRef.current?.(undefined as any);
      }
    });

    // Si no hay puntos trazados y hay ciudad configurada, usar centro referencial
    if ((!activePoints || activePoints.length === 0) && city?.trim()) {
      void geocodeCity(city)
        .then((center) => {
          if (!cancelled && center && mapRef.current) {
            mapRef.current.setView([center.latitude, center.longitude], 14);
          }
        })
        .catch(() => {
          // Ignorar silenciosamente
        });
    }

    // InvalidateSize progresivo para modales
    const timer1 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 60);

    const timer2 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);

    const timer3 = setTimeout(() => {
      if (!cancelled && mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 450);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
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
      markerLayerRef.current = null;
      polygonLayerRef.current = null;
      editLayerRef.current = null;
      snapIndicatorLayerRef.current = null;
    };
  }, [initialCenter]);



  // Recalcular tamaño al cambiar modo de pantalla completa
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 60);
      const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isFullscreen]);

  // Manejar tecla Escape para salir de pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Recalcular tamaño al cambiar modo de edición
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [isEditingPolygon]);

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

  // Renderizar capas de territorios, puntos de salida y vértices editables
  useEffect(() => {
    const map = mapRef.current;
    const polygonLayer = polygonLayerRef.current;
    const markerLayer = markerLayerRef.current;
    const editLayer = editLayerRef.current;
    if (!map || !polygonLayer || !markerLayer || !editLayer) return;

    polygonLayer.clearLayers();
    markerLayer.clearLayers();
    editLayer.clearLayers();

    let targetBounds: L.LatLngBounds | null = null;

    // 1. Territorios en el mapa general con colores distintos
    territories.forEach((territory, index) => {
      const isSelected = territory.id === selectedTerritoryId;

      // Si este territorio está en modo edición activa, NO dibujarlo en la capa estática
      if (isEditingPolygon && isSelected) {
        return;
      }

      const polyPoints = territory.polygon || [];

      if (polyPoints.length >= 3) {
        const palette = getTerritoryColors(territory.number, index);
        const latLngs = polyPoints.map(
          ({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple
        );

        // Estilos: Color distintivo para cada territorio.
        // Si está seleccionado, borde oscuro de alto contraste y mayor opacidad.
        const polygon = L.polygon(latLngs, {
          color: isSelected ? '#0f172a' : palette.stroke,
          weight: isSelected ? 4 : 2,
          fillColor: palette.fill,
          fillOpacity: isSelected ? 0.52 : 0.32,
          // Si estamos editando, desactivar interacción de otros polígonos para permitir clics libres
          interactive: !isEditingPolygon,
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

        // Popup con información al hacer clic sobre la sección del mapa
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
                : '<div style="color:#059669;font-weight:600;margin-bottom:3px;font-size:11px;">Disponible para asignación</div>'
            }
            ${
              territory.lastProgress
                ? `
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:4px;padding:3px 6px;margin-top:4px;color:#92400e;font-size:11px;">
                <b>📌 Dónde quedó:</b> ${territory.lastProgress}
                ${territory.lastProgressPublisher ? `<span style="color:#b45309;font-size:10px;display:block;">Por: ${territory.lastProgressPublisher}</span>` : ''}
              </div>
            `
                : ''
            }
            ${
              territory.observations
                ? `
              <div style="margin-top:4px;color:#64748b;font-size:11px;font-style:italic;">
                Nota: ${territory.observations}
              </div>
            `
                : ''
            }
          </div>
        `;

        polygon.bindPopup(popupContent, { maxWidth: 280, closeOnClick: true });

        if (!isEditingPolygon) {
          polygon.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            // Permitir seleccionar cualquier territorio inmediatamente
            selectRef.current?.(territory.id);
            polygon.openPopup(e.latlng);
          });

          polygon.on('mouseover', () => {
            polygon.setStyle({
              fillOpacity: 0.58,
              weight: isSelected ? 4.5 : 3,
            });
          });
          polygon.on('mouseout', () => {
            polygon.setStyle({
              fillOpacity: isSelected ? 0.52 : 0.32,
              weight: isSelected ? 4 : 2,
            });
          });
        }

        polygon.addTo(polygonLayer);

        if (isSelected && !isEditingPolygon) {
          targetBounds = polygon.getBounds();
        }
      }
    });

    // 2. Lugares de Predicación (Puntos de Salida) -> Azul Oscuro
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        fillColor: '#1e3a8a',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
        interactive: !isEditingPolygon,
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
            <a href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}" target="_blank" rel="noopener noreferrer" style="color:#1e40af;text-decoration:none;font-weight:600;font-size:11px;display:inline-flex;align-items:center;gap:3px;">
              Ver en Google Maps &rarr;
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popup, { maxWidth: 260 }).addTo(markerLayer);
    });

    // 3. Exhibidores públicos (Predicación pública) -> Morado
    publicPlaces.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 7,
        fillColor: '#7e22ce',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
        interactive: !isEditingPolygon,
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

    // 4. Edición interactiva: Marcadores arrastrables, eliminación y Snapping
    if (isEditingPolygon && points.length > 0) {
      let livePolygon: L.Polygon | L.Polyline | null = null;
      if (points.length >= 3) {
        livePolygon = L.polygon(
          points.map(({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple),
          {
            color: '#e11d48',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#fda4af',
            fillOpacity: 0.35,
            interactive: false,
          }
        ).addTo(editLayer);

        if (!hasInitialFitRef.current) {
          targetBounds = livePolygon.getBounds();
        }
      } else if (points.length === 2) {
        livePolygon = L.polyline(
          points.map(({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple),
          {
            color: '#e11d48',
            weight: 2.5,
            dashArray: '6, 6',
            interactive: false,
          }
        ).addTo(editLayer);
      }

      // Marcadores arrastrables para cada vértice
      const vertexMarkers: L.Marker[] = [];

      points.forEach((point, index) => {
        const marker = L.marker([point.latitude, point.longitude], {
          draggable: true,
          icon: L.divIcon({
            className: '',
            html: `
              <div style="
                width: 22px;
                height: 22px;
                border: 2.5px solid #ffffff;
                border-radius: 50%;
                background: #e11d48;
                box-shadow: 0 2px 6px rgba(0,0,0,0.45);
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                font-family: sans-serif;
                user-select: none;
              ">${index + 1}</div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        });

        marker.bindTooltip(`Vértice ${index + 1} (Arrastra para mover · Clic para borrar)`, {
          direction: 'top',
          offset: [0, -10],
        });

        marker.on('dragstart', (e) => {
          L.DomEvent.stopPropagation(e);
        });

        // Actualizar el polígono en tiempo real y aplicar Snapping Magnético durante el arrastre
        marker.on('drag', () => {
          if (mapRef.current && editStateRef.current.snappingEnabled) {
            const rawLatLng = marker.getLatLng();
            const snapped = calculateSnappedLatLng(
              rawLatLng,
              territoriesRef.current,
              selectedTerritoryId,
              mapRef.current
            );
            if (snapped.isSnapped) {
              marker.setLatLng([snapped.lat, snapped.lng]);
            }
          }

          if (livePolygon) {
            const liveLatLngs = vertexMarkers.map((m) => m.getLatLng());
            livePolygon.setLatLngs(liveLatLngs);
          }
        });

        marker.on('dragend', () => {
          let finalLatLng = marker.getLatLng();
          if (mapRef.current && editStateRef.current.snappingEnabled) {
            const snapped = calculateSnappedLatLng(
              finalLatLng,
              territoriesRef.current,
              selectedTerritoryId,
              mapRef.current
            );
            if (snapped.isSnapped) {
              finalLatLng = L.latLng(snapped.lat, snapped.lng);
              marker.setLatLng(finalLatLng);
              setSnapFeedback(snapped.info || 'Ajustado a territorio vecino');
              setTimeout(() => setSnapFeedback(null), 2500);
            }
          }

          const newCoords = vertexMarkers.map((m) => {
            const ll = m.getLatLng();
            return {
              latitude: Number(ll.lat.toFixed(6)),
              longitude: Number(ll.lng.toFixed(6)),
            };
          });
          setPoints(newCoords);
          editStateRef.current.onPolygonChange?.(newCoords);
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const popupDiv = document.createElement('div');
          popupDiv.style.cssText = 'text-align:center;padding:4px;min-width:130px;font-family:sans-serif;';
          popupDiv.innerHTML = `
            <div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:2px;">Vértice #${index + 1}</div>
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">Arrastra para mover</div>
            <button type="button" id="btn-del-vertex-${index}" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:4px;">
              🗑️ Eliminar punto
            </button>
          `;

          const btn = popupDiv.querySelector<HTMLButtonElement>(`#btn-del-vertex-${index}`);
          if (btn) {
            btn.onclick = () => {
              map.closePopup();
              const updated = editStateRef.current.points.filter((_, i) => i !== index);
              setPoints(updated);
              editStateRef.current.onPolygonChange?.(updated);
            };
          }

          marker.bindPopup(popupDiv, { offset: [0, -12] }).openPopup();
        });

        marker.on('contextmenu', (e) => {
          L.DomEvent.stopPropagation(e);
          const updated = editStateRef.current.points.filter((_, i) => i !== index);
          setPoints(updated);
          editStateRef.current.onPolygonChange?.(updated);
        });

        marker.addTo(editLayer);
        vertexMarkers.push(marker);
      });
    }

    // Auto-ajustar mapa a los límites solo en la carga inicial
    if (autoFitBounds && targetBounds && targetBounds.isValid() && !hasInitialFitRef.current) {
      map.fitBounds(targetBounds, {
        padding: [45, 45],
        maxZoom: 17,
        animate: false,
      });
      hasInitialFitRef.current = true;
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

  const handleUndoLastPoint = () => {
    if (points.length === 0) return;
    const updated = points.slice(0, -1);
    setPoints(updated);
    editStateRef.current.onPolygonChange?.(updated);
  };

  const handleResetPoints = () => {
    setPoints([]);
    editStateRef.current.onPolygonChange?.([]);
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen bg-slate-900 flex flex-col p-3 md:p-4 overflow-hidden'
          : 'flex flex-col w-full'
      }
    >
      {/* Recuadro de edición de límites FUERA del mapa (limpio, espacioso y sin tapar calles) */}
      {isEditingPolygon && (
        <div className="mb-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-3 shadow-xs shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-900">Modo Edición de Límites</span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
              {points.length} {points.length === 1 ? 'vértice' : 'vértices'}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 mb-2 space-y-0.5 bg-white p-2 rounded-lg border border-slate-200/80">
            <p>• <b>Clic en el mapa:</b> coloca un nuevo vértice perimetral.</p>
            <p>• <b>Arrastra los círculos numerados:</b> mueve y ajusta los límites.</p>
            <p>• <b>Clic o clic derecho en un punto:</b> elimina el vértice seleccionado.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSnappingEnabled(!snappingEnabled)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                snappingEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title={
                snappingEnabled
                  ? 'Ajuste magnético activo: los vértices se adhieren automáticamente a los límites de territorios vecinos'
                  : 'Ajuste magnético desactivado: trazado libre sin adherencia'
              }
            >
              <div className="flex items-center gap-1.5">
                <Magnet className={`w-3.5 h-3.5 ${snappingEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Ajuste Magnético (Imán)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${snappingEnabled ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}>
                {snappingEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndoLastPoint}
                disabled={points.length === 0}
                className="text-xs py-1 h-7.5 flex-1 sm:flex-initial justify-center"
                title="Deshacer el último vértice colocado"
              >
                <Undo2 className="w-3.5 h-3.5 mr-1 text-slate-600" />
                Deshacer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPoints}
                disabled={points.length === 0}
                className="text-xs py-1 h-7.5 flex-1 sm:flex-initial justify-center text-rose-700 hover:bg-rose-50 border-rose-200"
                title="Borrar todos los vértices del trazado"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Borrar todo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Mapa Leaflet (Completamente despejado y limpio) */}
      <div
        className={
          isFullscreen
            ? 'relative flex-1 w-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl'
            : `relative w-full ${heightClassName} rounded-xl overflow-hidden border border-slate-200 shadow-xs`
        }
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Controles flotantes: Selector Calles / Satélite y Pantalla Completa */}
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

          <span className="w-px h-4 bg-slate-200" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors ${
              isFullscreen
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver mapa en pantalla completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Salir Pantalla Completa</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Pantalla Completa</span>
              </>
            )}
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
        {!isEditingPolygon && (
          <div className="absolute bottom-2 right-2 z-[1000] hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-slate-200 text-[11px] text-slate-700">
            <span className="flex items-center gap-1 font-medium text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] border border-white shadow-xs inline-block"></span>
              Lugares Salida
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7e22ce] border border-white shadow-xs inline-block"></span>
              Predicación Pública
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span className="w-3 h-2 rounded-xs bg-blue-500/50 border border-blue-700 inline-block"></span>
              Territorios (Colores únicos)
            </span>
          </div>
        )}

        {/* Notificación flotante de Snapping / Imán */}
        {snapFeedback && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/95 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in duration-150">
            <Magnet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{snapFeedback}</span>
          </div>
        )}

        {mapError && (
          <div className="absolute top-3 left-3 z-[1000] rounded-lg bg-amber-50/95 border border-amber-200 px-3 py-2 text-xs text-amber-800 shadow-sm max-w-sm">
            {mapError} Puedes explorar el mapa y marcar directamente.
          </div>
        )}
      </div>
    </div>
  );
};
