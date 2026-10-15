import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { PublisherModal } from './PublisherModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Users,
  Plus,
  Search,
  Edit2,
  KeyRound,
  Trash2,
} from 'lucide-react';

interface PublishersViewProps {
  publishers: UserProfile[];
  onSavePublisher: (user: UserProfile) => Promise<void>;
  onDeletePublisher: (user: UserProfile) => Promise<void>;
}

export const PublishersView: React.FC<PublishersViewProps> = ({
  publishers,
  onSavePublisher,
  onDeletePublisher,
}) => {
  const { currentUser, requestPasswordRecovery } = useAuth();
  const isCoordinator = canManageUsers(currentUser?.role);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserProfile | null>(null);
  const [deletingItem, setDeletingItem] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPublishers = publishers.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (roleFilter !== 'all') {
      return p.role === roleFilter;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingItem(user);
    setModalOpen(true);
  };

  const handleToggleActive = async (user: UserProfile) => {
    if (!isCoordinator || user.id === currentUser?.id) return;
    await onSavePublisher({
      ...user,
      active: !user.active,
    });
  };

  const handleSendRecovery = async (user: UserProfile) => {
    try {
      await requestPasswordRecovery(user.email);
    } catch (e: any) {
      alert(`Error enviando recuperación: ${e.message}`);
    }
  };

  const handleDeletePublisher = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await onDeletePublisher(deletingItem);
      setDeletingItem(null);
    } catch (e: any) {
      alert(`Error eliminando publicador: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Directorio y Permisos</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Publicadores de la Congregación
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de cuentas, roles y privilegios de predicación
          </p>
        </div>

        {isCoordinator && (
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Registrar Publicador
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Filtrar rol:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="all">Todos los roles</option>
            <option value="COORDINADOR">Coordinador</option>
            <option value="SUPERINTENDENTE_DE_SERVICIO">Superintendente de Servicio</option>
            <option value="ASISTENTE_SUPERINTENDENTE_SERVICIO">Asistente Superintendente</option>
            <option value="PUBLICADOR">Publicador</option>
          </select>
        </div>
      </div>

      {/* Lista de Publicadores */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Nombre y Correo</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Privilegios</th>
                <th className="py-3 px-4">Estado</th>
                {isCoordinator && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPublishers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {user.fullName}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {user.email}
                      </span>
                      {user.phoneNumber && (
                        <span className="text-slate-400 text-[10px] block font-mono">
                          {user.phoneNumber}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-800">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      <span
                        className={
                          user.canLeadPreaching
                            ? 'text-slate-900 font-medium'
                            : 'text-slate-400'
                        }
                      >
                        {user.canLeadPreaching ? '✓ Dirige Salidas' : '— No dirige'}
                      </span>
                      <span
                        className={
                          user.canPublicPreaching
                            ? 'text-sky-800 font-medium'
                            : 'text-slate-400'
                        }
                      >
                        {user.canPublicPreaching ? '✓ Predicación Pública' : '— Sin carritos'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-medium ${
                        user.active ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {isCoordinator && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSendRecovery(user)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                          title="Enviar enlace para restablecer clave"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                          title="Editar perfil y permisos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user.id !== currentUser?.id && !user.isMasterAdmin && (
                          <button
                            onClick={() => setDeletingItem(user)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                            title="Eliminar publicador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <PublisherModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={onSavePublisher}
          initialData={editingItem}
          currentUserId={currentUser?.id}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeletePublisher}
        title="Eliminar publicador"
        message={`¿Seguro que deseas eliminar a ${deletingItem?.fullName}? También se eliminará su cuenta de acceso y no podrá iniciar sesión.`}
        confirmText="Eliminar"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
