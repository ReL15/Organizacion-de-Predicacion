import React, { useState, useEffect } from 'react';
import {
  WeeklyAssignment,
  PreachingPlace,
  UserProfile,
  Territory,
} from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { detectWeeklyConflicts } from '../../services/securityRules';
import { AlertTriangle } from 'lucide-react';

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

    const selectedTerritory = territories.find((t) => t.id === territoryId);

    const assignment: WeeklyAssignment = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      date,
      time,
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
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Lugar de Salida <span className="text-rose-500">*</span>
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
            Solo aparecen hermanos con el privilegio de dirigir activado en su perfil.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Territorio a trabajar (Opcional)
          </label>
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
        </div>

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
