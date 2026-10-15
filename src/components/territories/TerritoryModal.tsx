import React, { useState, useEffect } from 'react';
import {
  Territory,
  TerritoryStatus,
  UserProfile,
  GeoPoint,
} from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TerritoryMap } from '../map/TerritoryMap';

interface TerritoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (territory: Territory) => Promise<void>;
  initialData?: Territory | null;
  publishers: UserProfile[];
  allTerritories: Territory[];
}

export const TerritoryModal: React.FC<TerritoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  publishers,
  allTerritories,
}) => {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TerritoryStatus>('DISPONIBLE');
  const [observations, setObservations] = useState('');
  const [polygon, setPolygon] = useState<GeoPoint[]>([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);

  useEffect(() => {
    if (initialData) {
      setNumber(initialData.number);
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setStatus(initialData.status);
      setObservations(initialData.observations || '');
      setPolygon(initialData.polygon || []);
      setAssignedToId(initialData.lastAssignedToId || '');
    } else {
      // Siguiente número correlativo sugerido
      const maxNum = allTerritories.reduce((max, t) => {
        const n = parseInt(t.number, 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      setNumber(String(maxNum + 1).padStart(2, '0'));
      setName('');
      setDescription('');
      setStatus('DISPONIBLE');
      setObservations('');
      setPolygon([]);
      setAssignedToId('');
    }
    setErrorMessage('');
    setIsDrawingPolygon(false);
  }, [initialData, isOpen, allTerritories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!number.trim()) {
      setErrorMessage('El número de territorio es obligatorio.');
      return;
    }

    const assignedPublisher = publishers.find((p) => p.id === assignedToId);

    const territory: Territory = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      number: number.trim(),
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      status,
      polygon,
      active: true,
      observations: observations.trim() || undefined,
      lastAssignedDate:
        status === 'ASIGNADO' || status === 'EN_PROCESO'
          ? initialData?.lastAssignedDate || new Date().toISOString().split('T')[0]
          : initialData?.lastAssignedDate,
      lastAssignedToId: assignedPublisher?.id,
      lastAssignedToName: assignedPublisher?.fullName,
      lastCompletedDate:
        status === 'COMPLETADO'
          ? new Date().toISOString().split('T')[0]
          : initialData?.lastCompletedDate,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(territory);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el territorio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Editar Territorio #${initialData.number}` : 'Nuevo Territorio'}
      subtitle="Datos generales y trazado perimetral en el mapa"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Número de Territorio <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ej: 05"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nombre o Sector (Opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Residencial Utila Sur"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Estado del Territorio <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TerritoryStatus)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="DISPONIBLE">DISPONIBLE (Listo para asignar)</option>
              <option value="ASIGNADO">ASIGNADO</option>
              <option value="EN_PROCESO">EN_PROCESO (En trabajo)</option>
              <option value="COMPLETADO">COMPLETADO (Ciclo finalizado)</option>
              <option value="INACTIVO">INACTIVO (Baja temporal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Asignado actualmente a
            </label>
            <select
              value={assignedToId}
              onChange={(e) => {
                setAssignedToId(e.target.value);
                if (e.target.value && status === 'DISPONIBLE') {
                  setStatus('ASIGNADO');
                }
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">(Sin asignar)</option>
              {publishers
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.role.replace(/_/g, ' ')})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Descripción y límites verbales
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Ej: Desde 2.ª Calle Poniente hasta el límite con la quebrada..."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Observaciones o notas especiales
          </label>
          <input
            type="text"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Ej: Pedir permiso en garita con identificación oficial."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Editor de Polígono Geográfico */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">
                Polígono Geográfico del Territorio
              </span>
              <span className="text-[11px] text-slate-500">
                {polygon.length >= 3
                  ? `${polygon.length} vértices trazados correctamente`
                  : 'Se necesitan al menos 3 puntos para cerrar el polígono.'}
              </span>
            </div>
            <Button
              type="button"
              variant={isDrawingPolygon ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setIsDrawingPolygon(!isDrawingPolygon)}
            >
              {isDrawingPolygon ? 'Finalizar Edición' : 'Editar Límites en Mapa'}
            </Button>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200">
            <TerritoryMap
              territories={[]}
              isEditingPolygon={isDrawingPolygon}
              editingPolygonPoints={polygon}
              onPolygonChange={setPolygon}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Territorio' : 'Guardar Territorio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
