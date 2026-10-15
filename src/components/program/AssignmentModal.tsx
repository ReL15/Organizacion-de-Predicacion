import React, { useState, useEffect } from 'react';
import {
  WeeklyAssignment,
  PreachingPlace,
  UserProfile,
  Territory,
  PreachingActivityType,
} from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { detectWeeklyConflicts } from '../../services/securityRules';
import { getDayOfWeekName } from '../../lib/dateUtils';
import { AlertTriangle, MapPin } from 'lucide-react';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: WeeklyAssignment) => Promise<void>;
  initialData?: WeeklyAssignment | null;
  places: PreachingPlace[];
  publishers: UserProfile[];
  territories: Territory[];
  existingAssignments: WeeklyAssignment[];
}

const ACTIVITY_OPTIONS: {
  id: PreachingActivityType;
  label: string;
  badge: string;
  icon: string;
  hasTerritory: boolean;
  activeBorder: string;
  activeBg: string;
  activeRing: string;
  activeText: string;
}[] = [
  {
    id: 'TERRITORIO',
    label: 'Casa en casa',
    badge: 'Con territorio',
    icon: '🏠',
    hasTerritory: true,
    activeBorder: 'border-blue-400',
    activeBg: 'bg-blue-50/80',
    activeRing: 'ring-blue-400',
    activeText: 'text-blue-900',
  },
  {
    id: 'RURAL',
    label: 'Predicación Rural',
    badge: 'Etiqueta Rural',
    icon: '🌲',
    hasTerritory: true,
    activeBorder: 'border-emerald-400',
    activeBg: 'bg-emerald-50/80',
    activeRing: 'ring-emerald-400',
    activeText: 'text-emerald-900',
  },
  {
    id: 'CALLES',
    label: 'Por las calles',
    badge: 'Sin tarjeta',
    icon: '🚶',
    hasTerritory: false,
    activeBorder: 'border-amber-400',
    activeBg: 'bg-amber-50/80',
    activeRing: 'ring-amber-400',
    activeText: 'text-amber-900',
  },
  {
    id: 'ZOOM',
    label: 'Por Zoom',
    badge: 'Sin tarjeta',
    icon: '💻',
    hasTerritory: false,
    activeBorder: 'border-sky-400',
    activeBg: 'bg-sky-50/80',
    activeRing: 'ring-sky-400',
    activeText: 'text-sky-900',
  },
  {
    id: 'CARTAS',
    label: 'Cartas / Teléfono',
    badge: 'Sin tarjeta',
    icon: '✉️',
    hasTerritory: false,
    activeBorder: 'border-purple-400',
    activeBg: 'bg-purple-50/80',
    activeRing: 'ring-purple-400',
    activeText: 'text-purple-900',
  },
  {
    id: 'GIRA',
    label: 'Gira de Predicación',
    badge: 'Sin tarjeta',
    icon: '🚐',
    hasTerritory: false,
    activeBorder: 'border-teal-400',
    activeBg: 'bg-teal-50/80',
    activeRing: 'ring-teal-400',
    activeText: 'text-teal-900',
  },
];

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  places,
  publishers,
  territories,
  existingAssignments,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [activityType, setActivityType] = useState<PreachingActivityType>('TERRITORIO');
  const [placeId, setPlaceId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [territoryId, setTerritoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [hasConflict, setHasConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtrar solo hermanos con privilegio de dirigir reuniones para el servicio
  const eligibleLeaders = publishers.filter((p) => p.canLeadPreaching && p.active);
  const activePlaces = places.filter((p) => p.active);
  const activeTerritories = territories.filter((t) => t.active);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setTime(initialData.time);
      setActivityType(initialData.activityType || 'TERRITORIO');
      setPlaceId(initialData.placeId);
      setLeaderId(initialData.leaderId);
      setTerritoryId(initialData.territoryId || '');
      setNotes(initialData.notes || '');
      setHasConflict(Boolean(initialData.hasConflict));
    } else {
      // Valores por defecto
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTime('09:00');
      setActivityType('TERRITORIO');
      setPlaceId(activePlaces[0]?.id || '');
      setLeaderId(eligibleLeaders[0]?.id || '');
      setTerritoryId(activeTerritories[0]?.id || '');
      setNotes('');
      setHasConflict(false);
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  // Verificar conflictos en tiempo real cuando cambia fecha, hora o encargado
  useEffect(() => {
    if (date && time && leaderId) {
      const conflict = detectWeeklyConflicts(
        { id: initialData?.id, date, time, leaderId },
        existingAssignments
      );
      setHasConflict(conflict);
    } else {
      setHasConflict(false);
    }
  }, [date, time, leaderId, existingAssignments, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!date || !time) {
      setErrorMessage('La fecha y hora son obligatorias.');
      return;
    }

    const selectedPlace = places.find((p) => p.id === placeId);
    if (!selectedPlace) {
      setErrorMessage('Selecciona un lugar de salida.');
      return;
    }

    const selectedLeader = publishers.find((p) => p.id === leaderId);
    if (!selectedLeader) {
      setErrorMessage('Selecciona un encargado elegible para dirigir el grupo.');
      return;
    }

    const hasTerritory = activityType === 'TERRITORIO' || activityType === 'RURAL';
    const selectedTerritory = hasTerritory
      ? territories.find((t) => t.id === territoryId)
      : undefined;

    const assignment: WeeklyAssignment = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      date,
      time,
      activityType,
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      leaderId: selectedLeader.id,
      leaderName: selectedLeader.fullName,
      territoryId: selectedTerritory?.id,
      territoryNumber: selectedTerritory?.number,
      notes: notes.trim(),
      hasConflict,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(assignment);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la asignación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Asignación de Predicación' : 'Nueva Asignación Semanal'}
      subtitle="Reunión para el servicio del campo"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        {hasConflict && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold block">Posible conflicto de horario:</span>
              <span>
                El encargado seleccionado ya tiene otra asignación el mismo día a esta misma hora. Puedes continuar si es intencional.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Fecha <span className="text-rose-500">*</span>{' '}
              {date && (
                <span className="font-semibold text-blue-700 font-sans">
                  ({getDayOfWeekName(date)})
                </span>
              )}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Hora <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Selector de Modalidad de Predicación */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Modalidad de Predicación <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACTIVITY_OPTIONS.map((opt) => {
              const isSelected = activityType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setActivityType(opt.id);
                    if (!opt.hasTerritory) {
                      setTerritoryId('');
                    }
                  }}
                  className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? `${opt.activeBorder} ${opt.activeBg} ring-2 ${opt.activeRing}`
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{opt.icon}</span>
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? opt.activeText : 'text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {opt.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Lugar de Salida / Punto de Encuentro <span className="text-rose-500">*</span>
          </label>
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="">Selecciona un lugar...</option>
            {activePlaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.address})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Encargado de la reunión <span className="text-rose-500">*</span>
          </label>
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="">Selecciona un hermano elegible...</option>
            {eligibleLeaders.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Solo aparecen hermanos con el privilegio de dirigir reuniones activado en su perfil.
          </p>
        </div>

        {/* Sección de Territorio según modalidad */}
        {activityType === 'CALLES' ? (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-lg">🚶</span>
            <div>
              <span className="font-bold block text-amber-950">
                Predicación por las calles
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Para esta salida no hay tarjeta de territorio. Los publicadores predicarán en calles, avenidas o plazas de la localidad.
              </p>
            </div>
          </div>
        ) : activityType === 'ZOOM' ? (
          <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-start gap-2.5">
            <span className="text-lg">💻</span>
            <div>
              <span className="font-bold block text-sky-950">Predicación por Zoom</span>
              <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                Para esta salida no hay tarjeta de territorio. La reunión y la predicación se coordinan virtualmente por Zoom.
              </p>
            </div>
          </div>
        ) : activityType === 'CARTAS' ? (
          <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-start gap-2.5">
            <span className="text-lg">✉️</span>
            <div>
              <span className="font-bold block text-purple-950">
                Predicación por Cartas o Teléfono
              </span>
              <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                Para esta salida no hay tarjeta de territorio. Los publicadores redactan cartas o testifican telefónicamente.
              </p>
            </div>
          </div>
        ) : activityType === 'GIRA' ? (
          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-start gap-2.5">
            <span className="text-lg">🚐</span>
            <div>
              <span className="font-bold block text-teal-950">
                Gira de Predicación
              </span>
              <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                Para esta salida no hay tarjeta de territorio. El grupo viaja a apoyar otra zona o territorio especial.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                {activityType === 'RURAL'
                  ? 'Territorio Rural a trabajar (Opcional)'
                  : 'Territorio a trabajar (Opcional)'}
              </label>
              {activityType === 'RURAL' && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  🌲 Salida Rural
                </span>
              )}
            </div>
            <select
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">Sin territorio fijado</option>
              {activeTerritories.map((t) => (
                <option key={t.id} value={t.id}>
                  Territorio #{t.number} {t.name ? `- ${t.name}` : ''} ({t.status})
                </option>
              ))}
            </select>
            {activityType === 'RURAL' && (
              <p className="text-[11px] text-emerald-800 mt-1">
                Esta salida se etiquetará automáticamente como <b>Predicación Rural</b> en el programa semanal y en el documento PDF oficial.
              </p>
            )}

            {(() => {
              const currentTerr = territories.find((t) => t.id === territoryId);
              if (!currentTerr?.lastProgress) return null;
              return (
                <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block text-blue-950">
                      📌 Dónde quedó este territorio:
                    </span>
                    <span className="block mt-0.5">{currentTerr.lastProgress}</span>
                    {currentTerr.lastProgressDate && (
                      <span className="block text-[11px] text-blue-700 mt-0.5">
                        Registrado el {currentTerr.lastProgressDate}{' '}
                        {currentTerr.lastProgressPublisher
                          ? `por ${currentTerr.lastProgressPublisher}`
                          : ''}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const noteToAdd = `Continuar en: ${currentTerr.lastProgress}`;
                        setNotes((prev) => (prev ? `${prev} · ${noteToAdd}` : noteToAdd));
                      }}
                      className="mt-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline block"
                    >
                      + Copiar a las notas de la reunión
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Notas u observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Salida para jóvenes, trabajar pasaje central..."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Asignación' : 'Crear Asignación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
