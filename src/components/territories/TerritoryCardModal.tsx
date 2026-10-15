import React from 'react';
import { Territory, Congregation, PreachingPlace } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TerritoryMap } from '../map/TerritoryMap';
import {
  MapPin,
  Calendar,
  User,
  ExternalLink,
  FileText,
  Building2,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface TerritoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  territory: Territory;
  congregation: Congregation;
  onOpenProgressModal?: (territory: Territory) => void;
  places?: PreachingPlace[];
  canRecordProgress?: boolean;
}

export const TerritoryCardModal: React.FC<TerritoryCardModalProps> = ({
  isOpen,
  onClose,
  territory,
  congregation,
  onOpenProgressModal,
  places = [],
  canRecordProgress = false,
}) => {
  // Calcular el centro aproximado para abrir directamente en Google Maps
  const polygonPoints = territory.polygon || [];
  let centerLat = congregation.latitude || 13.674;
  let centerLng = congregation.longitude || -89.284;

  if (polygonPoints.length > 0) {
    centerLat =
      polygonPoints.reduce((sum, p) => sum + p.latitude, 0) / polygonPoints.length;
    centerLng =
      polygonPoints.reduce((sum, p) => sum + p.longitude, 0) / polygonPoints.length;
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;

  const statusBadgeColor =
    territory.status === 'DISPONIBLE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : territory.status === 'ASIGNADO'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : territory.status === 'EN_PROCESO'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : territory.status === 'COMPLETADO'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tarjeta de Territorio #${territory.number}`}
      subtitle={`${congregation.name}${congregation.circuit ? ` · Circuito ${congregation.circuit}` : ''}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Cabecera de la tarjeta tipo S-12 */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 font-mono">
                Territorio #{territory.number}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeColor}`}
              >
                {territory.status}
              </span>
            </div>
            {territory.name && (
              <p className="text-xs font-medium text-slate-700 mt-0.5">
                Sector: {territory.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Abrir en Google Maps
            </a>

            {onOpenProgressModal && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenProgressModal(territory);
                }}
                className="text-xs py-1 h-8"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Registrar Predicación
              </Button>
            )}
          </div>
        </div>

        {/* Tarjeta de información del territorio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Asignación y fechas */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Asignación Actual
            </span>
            <div className="text-slate-600">
              <span className="text-slate-400">Publicador: </span>
              <b className="text-slate-800">
                {territory.lastAssignedToName || 'Disponible para asignación'}
              </b>
            </div>
            {territory.lastAssignedDate && (
              <div className="text-slate-500 text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Asignado el: {territory.lastAssignedDate}
              </div>
            )}
            {territory.lastCompletedDate && (
              <div className="text-purple-700 text-[11px] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-purple-500" />
                Completado el: {territory.lastCompletedDate}
              </div>
            )}
          </div>

          {/* Dónde quedó el territorio (Registro de Predicación) */}
          <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5">
            <span className="font-semibold text-blue-950 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Último Registro de Predicación
            </span>
            {territory.lastProgress ? (
              <>
                <div className="text-blue-900 font-medium">
                  {territory.lastProgress}
                </div>
                {(territory.lastProgressDate || territory.lastProgressPublisher) && (
                  <div className="text-[11px] text-blue-700 font-mono">
                    {territory.lastProgressDate && `Fecha: ${territory.lastProgressDate}`}
                    {territory.lastProgressPublisher && ` · por ${territory.lastProgressPublisher}`}
                  </div>
                )}
              </>
            ) : (
              <p className="text-blue-700/80 italic text-[11px]">
                {canRecordProgress
                  ? 'Aún no se ha registrado dónde se quedó la última vez. Puedes usar el botón de "Registro de Predicación" para anotarlo.'
                  : 'Aún no se ha registrado dónde se quedó la última vez. El hermano con el privilegio de dirigir la predicación anotará el avance.'}
              </p>
            )}
          </div>
        </div>

        {/* Límites y descripción */}
        {territory.description && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-800 block mb-0.5">
              Límites y descripción verbal:
            </span>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {territory.description}
            </p>
          </div>
        )}

        {/* Observaciones especiales */}
        {territory.observations && (
          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
            <span className="font-semibold text-amber-900 flex items-center gap-1 mb-0.5">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              Observaciones o advertencias:
            </span>
            <p className="text-amber-800">{territory.observations}</p>
          </div>
        )}

        {/* Salón del Reino de la Congregación */}
        {congregation.address && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <b>Salón del Reino:</b> {congregation.address}
            </span>
          </div>
        )}

        {/* Mapa detallado de Google Maps con la puntuación exacta */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-600" />
              Mapa del Territorio (Google Maps)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {polygonPoints.length} vértices perimetrales
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200">
            <TerritoryMap
              territories={[territory]}
              places={places}
              selectedTerritoryId={territory.id}
              city={congregation.city}
              heightClassName="h-[340px]"
              autoFitBounds={true}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Haz clic en la sección del mapa o en los puntos para ver detalles. Puedes hacer zoom o alternar a vista satelital arriba a la derecha.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div>
            {canRecordProgress && onOpenProgressModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenProgressModal(territory);
                }}
                className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Registrar Avance
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar Tarjeta
          </Button>
        </div>
      </div>
    </Modal>
  );
};
