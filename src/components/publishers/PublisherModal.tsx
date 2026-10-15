import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface PublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserProfile) => Promise<void>;
  initialData?: UserProfile | null;
  currentUserId?: string;
}

export const PublisherModal: React.FC<PublisherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentUserId,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('PUBLICADOR');
  const [canLeadPreaching, setCanLeadPreaching] = useState(false);
  const [canPublicPreaching, setCanPublicPreaching] = useState(false);
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSelf = initialData?.id === currentUserId;

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setEmail(initialData.email);
      setPhoneNumber(initialData.phoneNumber || '');
      setRole(initialData.role);
      setCanLeadPreaching(initialData.canLeadPreaching);
      setCanPublicPreaching(initialData.canPublicPreaching);
      setActive(initialData.active);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setRole('PUBLICADOR'); // Nuevos usuarios empiezan por defecto como Publicador
      setCanLeadPreaching(false);
      setCanPublicPreaching(true);
      setActive(true);
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Nombre y apellido son obligatorios.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    const user: UserProfile = {
      id: initialData?.id || '',
      congregationId: initialData?.congregationId || '',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim() || undefined,
      role,
      canLeadPreaching,
      canPublicPreaching,
      active,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el publicador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Editar Miembro: ${initialData.fullName}` : 'Registrar Nuevo Publicador'}
      subtitle="Datos del perfil, rol y privilegios de predicación"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej: Daniel"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Apellido <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej: Rivera"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Correo Electrónico <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.org"
            required
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Teléfono Móvil (Opcional)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+503 7123-4567"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Rol Congregacional <span className="text-rose-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSelf}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="PUBLICADOR">PUBLICADOR (Consulta y turnos autorizados)</option>
            <option value="ASISTENTE_SUPERINTENDENTE_SERVICIO">
              ASISTENTE SUPERINTENDENTE SERVICIO (Gestión operativa)
            </option>
            <option value="SUPERINTENDENTE_DE_SERVICIO">
              SUPERINTENDENTE DE SERVICIO (Gestión operativa de predicación)
            </option>
            <option value="COORDINADOR">
              COORDINADOR (Administración completa de miembros y congregación)
            </option>
          </select>
          {isSelf && (
            <p className="text-[11px] text-amber-600 mt-1">
              Por seguridad, no puedes modificar tu propio rol.
            </p>
          )}
        </div>

        {/* Privilegios operativos */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-semibold text-slate-800 block mb-1">
            Privilegios de Servicio Asignados
          </span>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canLeadPreaching}
              onChange={(e) => setCanLeadPreaching(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
            />
            <span className="text-xs text-slate-700">
              Aprobado para <b>dirigir reuniones para el servicio del campo</b>
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canPublicPreaching}
              onChange={(e) => setCanPublicPreaching(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
            />
            <span className="text-xs text-slate-700">
              Aprobado para participar en <b>predicación pública (carritos)</b>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pub-active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={isSelf}
            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
          />
          <label htmlFor="pub-active" className="text-xs text-slate-700 font-medium">
            Cuenta activa en la congregación
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Perfil' : 'Crear Cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
