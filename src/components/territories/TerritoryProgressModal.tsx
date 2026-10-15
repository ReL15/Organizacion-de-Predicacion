import React, { useState, useEffect } from 'react';
import { Territory, TerritoryStatus, UserProfile } from '../../types';
import { canRecordPreachingProgress } from '../../services/securityRules';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MapPin, Calendar, User, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TerritoryProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  territory: Territory;
  currentUser: UserProfile | null;
  publishers: UserProfile[];
  onSaveProgress: (
    territory: Territory,
    progressData: {
      progress: string;
      date: string;
      publisherName: string;
      notes?: string;
      status?: TerritoryStatus;
    }
  ) => Promise<void>;
}

export const TerritoryProgressModal: React.FC<TerritoryProgressModalProps> = ({
  isOpen,
  onClose,
  territory,
  currentUser,
  publishers,
  onSaveProgress,
}) => {
  const isAuthorized = canRecordPreachingProgress(currentUser);
  const [progress, setProgress] = useState(territory.lastProgress || '');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [publisherName, setPublisherName] = useState(
    currentUser?.fullName || territory.lastAssignedToName || ''
  );
  const [status, setStatus] = useState<TerritoryStatus>(
    territory.status === 'COMPLETADO' ? 'COMPLETADO' : 'EN_PROCESO'
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (territory) {
      setProgress(territory.lastProgress || '');
      setDate(new Date().toISOString().split('T')[0]);
      setPublisherName(currentUser?.fullName || territory.lastAssignedToName || '');
      setStatus(territory.status === 'COMPLETADO' ? 'COMPLETADO' : 'EN_PROCESO');
      setNotes('');
      setErrorMessage('');
    }
  }, [territory, currentUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthorized) {
      setErrorMessage(
        'Acceso restringido: Solo los hermanos que tienen el privilegio de dirigir la predicación o superintendentes pueden realizar registros de territorio.'
      );
      return;
    }

    if (!progress.trim()) {
      setErrorMessage('Por favor especifica dónde quedó el territorio (calle, manzana o casa).');
      return;
    }

    if (!date) {
      setErrorMessage('La fecha es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveProgress(territory, {
        progress: progress.trim(),
        date,
        publisherName: publisherName.trim() || 'Publicador',
        notes: notes.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el registro de predicación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registro de Predicación · Territorio #${territory.number}`}
      subtitle="Anota dónde quedó el territorio para coordinar la próxima salida del programa de predicación."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        {!isAuthorized && (
          <div className="p-3 text-xs bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b>Acceso restringido:</b> Solo los hermanos con el privilegio de dirigir la predicación o superintendentes pueden guardar registros de territorio.
            </div>
          </div>
        )}

        {/* Resumen del territorio */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 font-mono text-sm">
              Territorio #{territory.number}
            </span>
            <span className="text-slate-500 font-medium">
              {territory.name || 'Sin sector asignado'}
            </span>
          </div>
          {territory.lastProgress && (
            <p className="text-[11px] text-blue-700">
              <b>Último registro previo:</b> {territory.lastProgress} ({territory.lastProgressDate || 'Sin fecha'})
            </p>
          )}
        </div>

        {/* Campo principal: Dónde quedó el territorio */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            ¿Dónde quedó el territorio? <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            rows={3}
            required
            placeholder="Ej: Se quedó en Calle El Mirador, Pasaje 2, casa #14. Queda pendiente el lado poniente y la avenida principal."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-sans"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Este dato aparecerá automáticamente en las asignaciones del Programa Semanal de Predicación para que el encargado del grupo sepa exactamente dónde continuar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Fecha de la actividad <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          {/* Conductor / Publicador */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Conductor / Quien reporta <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={publisherName}
              onChange={(e) => setPublisherName(e.target.value)}
              placeholder="Nombre del hermano"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Estado resultante del territorio */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Estado del territorio tras esta salida
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TerritoryStatus)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="EN_PROCESO">EN PROCESO (Territorio a medio abarcar)</option>
            <option value="COMPLETADO">COMPLETADO (Se terminó de abarcar todo el territorio)</option>
            <option value="ASIGNADO">ASIGNADO (Permanece asignado al publicador)</option>
          </select>
        </div>

        {/* Observaciones o notas para la próxima salida */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Notas o instrucciones para la próxima salida (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Comenzar desde la casa #15 pasaje 2. En casa #7 vive persona que trabaja de noche."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting} disabled={isSubmitting || !isAuthorized}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Guardar Registro
          </Button>
        </div>
      </form>
    </Modal>
  );
};
