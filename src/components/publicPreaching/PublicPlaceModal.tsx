import React, { useEffect, useState } from 'react';
import { GeoPoint, PublicPreachingPlace } from '../../types';
import { CoordinatePickerMap } from '../map/CoordinatePickerMap';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface PublicPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: PublicPreachingPlace) => Promise<void>;
  initialData?: PublicPreachingPlace | null;
  city?: string;
}

const WEEKDAYS: PublicPreachingPlace['day'][] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const PublicPlaceModal: React.FC<PublicPlaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  city,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [coordinates, setCoordinates] = useState<GeoPoint>({
    latitude: initialData?.latitude || 0,
    longitude: initialData?.longitude || 0,
  });
  const [day, setDay] = useState<PublicPreachingPlace['day']>(initialData?.day || 'Sábado');
  const [time, setTime] = useState(initialData?.time || '09:00');
  const [duration, setDuration] = useState(initialData?.duration || 60);
  const [description, setDescription] = useState(initialData?.description || '');
  const [active, setActive] = useState(initialData?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setName(initialData?.name || '');
    setAddress(initialData?.address || '');
    setCoordinates(
      initialData
        ? { latitude: initialData.latitude, longitude: initialData.longitude }
        : { latitude: 0, longitude: 0 }
    );
    setDay(initialData?.day || 'Sábado');
    setTime(initialData?.time || '09:00');
    setDuration(initialData?.duration || 60);
    setDescription(initialData?.description || '');
    setActive(initialData?.active ?? true);
    setErrorMessage('');
  }, [initialData, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (!name.trim() || !address.trim()) {
      setErrorMessage('El nombre y la dirección son obligatorios.');
      return;
    }
    if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
      setErrorMessage('Ingresa coordenadas GPS válidas.');
      return;
    }

    const place: PublicPreachingPlace = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      name: name.trim(),
      address: address.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      day,
      time,
      duration,
      description: description.trim() || undefined,
      active,
      fixedMemberIds: initialData?.fixedMemberIds || [],
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(place);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al guardar el punto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Punto de Exhibidores' : 'Agregar Punto de Exhibidores'}
      subtitle="Ubicación fija para la predicación pública con exhibidores"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        <label className="block text-xs font-medium text-slate-700">
          Nombre del punto <span className="text-rose-500">*</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Parque central"
            required
            className="mt-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </label>

        <label className="block text-xs font-medium text-slate-700">
          Dirección <span className="text-rose-500">*</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Calle, colonia, ciudad"
            required
            className="mt-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs font-medium text-slate-700">
            Día habitual
            <select
              value={day}
              onChange={(event) => setDay(event.target.value as PublicPreachingPlace['day'])}
              className="mt-1 w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {WEEKDAYS.map((weekday) => <option key={weekday}>{weekday}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-700">
            Hora
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
              className="mt-1 w-full px-2 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Duración (min)
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
              className="mt-1 w-full px-2 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </label>
        </div>

        <CoordinatePickerMap
          value={coordinates}
          onChange={setCoordinates}
          city={city}
          label="Ubicación GPS"
          markerColor="#7e22ce"
        />

        <label className="block text-xs font-medium text-slate-700">
          Indicaciones (opcional)
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Punto activo
        </label>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Guardar Cambios' : 'Agregar Punto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
