import React, { useState, useEffect } from 'react';
import { PreachingPlace, GeoPoint } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CoordinatePickerMap } from '../map/CoordinatePickerMap';

interface PlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: PreachingPlace) => Promise<void>;
  initialData?: PreachingPlace | null;
  city?: string;
}

export const PlaceModal: React.FC<PlaceModalProps> = ({
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
  const [description, setDescription] = useState(initialData?.description || '');
  const [active, setActive] = useState(initialData?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAddress(initialData.address);
      setCoordinates({
        latitude: initialData.latitude,
        longitude: initialData.longitude,
      });
      setDescription(initialData.description || '');
      setActive(initialData.active);
    } else {
      setName('');
      setAddress('');
      setCoordinates({
        latitude: 0,
        longitude: 0,
      });
      setDescription('');
      setActive(true);
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('El nombre del punto de salida es obligatorio.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('La dirección es obligatoria.');
      return;
    }

    const place: PreachingPlace = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      name: name.trim(),
      address: address.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      description: description.trim() || undefined,
      active,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(place);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el lugar de salida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Lugar de Salida' : 'Nuevo Lugar de Salida'}
      subtitle="Punto de reunión habitual para el servicio del campo"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Nombre del Punto <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Salón del Reino Central o Casa Fam. Gómez"
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Dirección Completa <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: 4.ª Calle Poniente #3-4, Santa Tecla"
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Selector GPS sobre Google Maps */}
        <CoordinatePickerMap
          value={coordinates}
          onChange={setCoordinates}
          label="Ubicación geográfica en el mapa"
          city={city}
          markerColor="#1e3a8a"
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Descripción o indicaciones de llegada
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Ej: Estacionarse solo en el lado derecho de la acera."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="place-active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
          />
          <label htmlFor="place-active" className="text-xs text-slate-700 font-medium">
            Lugar activo para programar salidas
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Lugar' : 'Crear Lugar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
