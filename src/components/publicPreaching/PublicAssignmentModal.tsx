import React, { useState, useEffect } from 'react';
import {
  PublicPreachingAssignment,
  PublicPreachingPlace,
  UserProfile,
  PublicParticipant,
} from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { validatePublicPreachingParticipants, detectPublicConflicts } from '../../services/securityRules';
import { AlertCircle, UserPlus, X, AlertTriangle } from 'lucide-react';

interface PublicAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: PublicPreachingAssignment) => Promise<void>;
  initialData?: PublicPreachingAssignment | null;
  places: PublicPreachingPlace[];
  publishers: UserProfile[];
  existingAssignments: PublicPreachingAssignment[];
}

export const PublicAssignmentModal: React.FC<PublicAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  places,
  publishers,
  existingAssignments,
}) => {
  const [placeId, setPlaceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [duration, setDuration] = useState(90);
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');

  // Solo hermanos autorizados para predicación pública
  const eligiblePublishers = publishers.filter((p) => p.canPublicPreaching && p.active);
  const activePlaces = places.filter((p) => p.active);

  useEffect(() => {
    if (initialData) {
      setPlaceId(initialData.placeId);
      setDate(initialData.date);
      setTime(initialData.time);
      setDuration(initialData.duration);
      setParticipants(initialData.participants || []);
      setNotes(initialData.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      const defaultPlace = activePlaces[0];
      setPlaceId(defaultPlace?.id || '');
      setDate(today);
      setTime(defaultPlace?.time || '09:30');
      setDuration(defaultPlace?.duration || 90);
      setNotes('');

      // Si el punto tiene participantes fijos configurados, precargarlos
      if (defaultPlace && defaultPlace.fixedMemberIds?.length > 0) {
        const fixedList: PublicParticipant[] = [];
        defaultPlace.fixedMemberIds.forEach((id) => {
          const user = publishers.find((u) => u.id === id);
          if (user) {
            fixedList.push({ userId: user.id, userName: user.fullName, isFixed: true });
          }
        });
        setParticipants(fixedList);
      } else {
        setParticipants([]);
      }
    }
    setValidationError('');
    setConflictWarning('');
  }, [initialData, isOpen]);

  // Verificar conflictos
  useEffect(() => {
    if (date && time && participants.length > 0) {
      const conflictCheck = detectPublicConflicts(
        {
          id: initialData?.id,
          date,
          time,
          participantIds: participants.map((p) => p.userId),
        },
        existingAssignments
      );

      if (conflictCheck.hasConflict) {
        setConflictWarning(
          `Posible conflicto de horario: ${conflictCheck.conflictedUserNames.join(
            ', '
          )} ya tiene otro turno de carritos asignado en la misma fecha y hora.`
        );
      } else {
        setConflictWarning('');
      }
    }
  }, [date, time, participants, existingAssignments, initialData]);

  const handleAddParticipant = () => {
    if (!selectedUserIdToAdd) return;
    setValidationError('');

    if (participants.some((p) => p.userId === selectedUserIdToAdd)) {
      setValidationError('Esta persona ya está agregada al turno.');
      return;
    }

    if (participants.length >= 3) {
      setValidationError('Máximo 3 participantes permitidos por turno de predicación pública.');
      return;
    }

    const user = publishers.find((u) => u.id === selectedUserIdToAdd);
    if (!user) return;

    setParticipants([
      ...participants,
      {
        userId: user.id,
        userName: user.fullName,
        isFixed: false,
      },
    ]);
    setSelectedUserIdToAdd('');
  };

  const handleRemoveParticipant = (userId: string) => {
    setParticipants(participants.filter((p) => p.userId !== userId));
    setValidationError('');
  };

  const handleToggleFixed = (userId: string) => {
    setParticipants(
      participants.map((p) =>
        p.userId === userId ? { ...p, isFixed: !p.isFixed } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validación estricta en el cliente (2 a 3 participantes)
    const check = validatePublicPreachingParticipants(participants);
    if (!check.valid) {
      setValidationError(check.error || 'Número de participantes inválido.');
      return;
    }

    const selectedPlace = places.find((p) => p.id === placeId);
    if (!selectedPlace) {
      setValidationError('Selecciona el punto de predicación pública.');
      return;
    }

    const assignment: PublicPreachingAssignment = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      date,
      time,
      duration: Number(duration),
      participants,
      notes: notes.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(assignment);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Error al guardar la asignación pública.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Turno de Predicación Pública' : 'Nuevo Turno de Carrito'}
      subtitle="Exhibidores móviles (Norma: entre 2 y 3 participantes)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {conflictWarning && (
          <div className="p-3 text-xs bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{conflictWarning}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Punto de Predicación Pública <span className="text-rose-500">*</span>
          </label>
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="">Selecciona el punto de carrito...</option>
            {activePlaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.day} a las {p.time})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Fecha <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Duración (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={30}
              max={240}
              step={15}
              required
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Sección de participantes con validación visual estricta (2-3) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Participantes Asignados <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs font-mono font-semibold tabular-nums px-2 py-0.5 rounded ${
                participants.length >= 2 && participants.length <= 3
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {participants.length} de 2–3 requeridos
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No hay participantes seleccionados aún. Agrega de 2 a 3 hermanos abajo.
            </p>
          ) : (
            <div className="space-y-1.5">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{p.userName}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleFixed(p.userId)}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        p.isFixed
                          ? 'bg-sky-100 text-sky-800 font-medium'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Alternar participante fijo del punto"
                    >
                      {p.isFixed ? 'Fijo' : 'Ocasional'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.userId)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    aria-label={`Quitar a ${p.userName}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {participants.length < 3 && (
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="">Selecciona publicador elegible...</option>
                {eligiblePublishers
                  .filter((ep) => !participants.some((p) => p.userId === ep.id))
                  .map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.fullName}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParticipant}
                disabled={!selectedUserIdToAdd}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Agregar
              </Button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Instrucciones o notas del turno
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Recoger el carrito en el salón a las 09:15..."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Turno' : 'Programar Turno'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
