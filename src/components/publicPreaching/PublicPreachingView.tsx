import React, { useState } from 'react';
import {
  Congregation,
  PublicPreachingAssignment,
  PublicPreachingPlace,
  UserProfile,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManagePreachingOperations } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PublicAssignmentModal } from './PublicAssignmentModal';
import { pdfGenerator } from '../../services/pdfGenerator';
import {
  Share2,
  Plus,
  FileDown,
  Search,
  MapPin,
  Clock,
  Users,
  Edit2,
  Trash2,
} from 'lucide-react';

interface PublicPreachingViewProps {
  congregation: Congregation;
  assignments: PublicPreachingAssignment[];
  places: PublicPreachingPlace[];
  publishers: UserProfile[];
  onSaveAssignment: (assignment: PublicPreachingAssignment) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onSavePlace: (place: PublicPreachingPlace) => Promise<void>;
}

export const PublicPreachingView: React.FC<PublicPreachingViewProps> = ({
  congregation,
  assignments,
  places,
  publishers,
  onSaveAssignment,
  onDeleteAssignment,
  onSavePlace,
}) => {
  const { currentUser } = useAuth();
  const canEdit = canManagePreachingOperations(currentUser?.role);

  const [activeTab, setActiveTab] = useState<'turnos' | 'puntos'>('turnos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PublicPreachingAssignment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAssignments = assignments
    .filter(
      (a) =>
        a.placeName.toLowerCase().includes(search.toLowerCase()) ||
        a.participants.some((p) => p.userName.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PublicPreachingAssignment) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDeleteAssignment(deleteConfirmId);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Exhibidores Móviles</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Predicación Pública (Carritos)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnos de carritos en zonas de alto tránsito (2 a 3 participantes por turno)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pdfGenerator.generatePublicPreachingPdf(congregation, filteredAssignments)
            }
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Descargar PDF
          </Button>

          {canEdit && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Turno
            </Button>
          )}
        </div>
      </div>

      {/* Subpestañas y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('turnos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-1 sm:flex-initial ${
              activeTab === 'turnos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Turnos Programados ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('puntos')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-1 sm:flex-initial ${
              activeTab === 'puntos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Puntos Fijos ({places.length})
          </button>
        </div>

        {activeTab === 'turnos' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por lugar o participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        )}
      </div>

      {/* Vista de Turnos Programados */}
      {activeTab === 'turnos' && (
        <>
          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={<Share2 className="w-6 h-6" />}
              title="No hay turnos de predicación pública programados"
              description="Programa turnos de exhibidores móviles asignando entre 2 y 3 participantes elegibles."
              actionText={canEdit ? 'Programar Primer Turno' : undefined}
              onAction={canEdit ? handleOpenCreate : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                        {item.date} · {item.time}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {item.duration} min
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-slate-900">
                      {item.placeName}
                    </h3>

                    {/* Lista de participantes (2-3) */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="font-medium text-slate-700">
                          Participantes ({item.participants.length}):
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          Regla 2-3 cumplida
                        </span>
                      </div>
                      <div className="space-y-1">
                        {item.participants.map((p) => (
                          <div
                            key={p.userId}
                            className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded"
                          >
                            <span className="font-medium text-slate-800">{p.userName}</span>
                            {p.isFixed && (
                              <span className="text-[10px] text-sky-700 font-medium">
                                Fijo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-3 bg-slate-50/50 p-2 rounded">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                        title="Editar turno"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100"
                        title="Eliminar turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Vista de Puntos Fijos */}
      {activeTab === 'puntos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.map((place) => (
            <div
              key={place.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{place.name}</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {place.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-2">{place.address}</p>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg font-mono">
                  <div>Día habitual: {place.day}</div>
                  <div>Hora: {place.time} ({place.duration} min)</div>
                </div>

                {place.description && (
                  <p className="text-xs text-slate-500 italic mt-2">
                    {place.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PublicAssignmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={onSaveAssignment}
          initialData={editingItem}
          places={places}
          publishers={publishers}
          existingAssignments={assignments}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Turno de Carrito"
        message="¿Estás seguro de que deseas eliminar este turno de predicación pública? Esta acción quedará registrada en la bitácora."
        confirmText="Eliminar Turno"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
