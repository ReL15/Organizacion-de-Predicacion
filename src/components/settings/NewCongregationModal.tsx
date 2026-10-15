import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Congregation } from '../../types';

interface NewCongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (cong: { name: string; circuit?: string; city?: string; timezone: string }) => Promise<void>;
}

export const NewCongregationModal: React.FC<NewCongregationModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [circuit, setCircuit] = useState('SV-04');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState('America/El_Salvador');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('El nombre de la congregación es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        circuit: circuit.trim() || undefined,
        city: city.trim() || undefined,
        timezone,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la congregación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Congregación"
      subtitle="Acceso exclusivo del Usuario Maestro / Administrador Global"
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
            Nombre de la Congregación <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Congregación Santa Elena"
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Ciudad (para centrar los mapas)
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej: Santa Tecla, El Salvador"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Circuito (Opcional)
          </label>
          <input
            type="text"
            value={circuit}
            onChange={(e) => setCircuit(e.target.value)}
            placeholder="Ej: SV-04"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Zona Horaria
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono"
          >
            <option value="America/El_Salvador">America/El_Salvador (UTC-6)</option>
            <option value="America/Guatemala">America/Guatemala (UTC-6)</option>
            <option value="America/Tegucigalpa">America/Tegucigalpa (UTC-6)</option>
            <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
            <option value="America/Bogota">America/Bogota (UTC-5)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (UTC-3)</option>
            <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isLoading}>
            Crear e Iniciar Congregación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
