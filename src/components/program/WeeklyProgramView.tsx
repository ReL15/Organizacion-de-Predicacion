import React, { useState, useMemo } from 'react';
import {
  Congregation,
  WeeklyAssignment,
  PreachingPlace,
  UserProfile,
  Territory,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManagePreachingOperations } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AssignmentModal } from './AssignmentModal';
import { getDayOfWeekName } from '../../lib/dateUtils';
import { pdfGenerator } from '../../services/pdfGenerator';
import { imageGenerator } from '../../services/imageGenerator';
import {
  CalendarDays,
  Plus,
  FileDown,
  Image as ImageIcon,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface WeeklyProgramViewProps {
  congregation: Congregation;
  assignments: WeeklyAssignment[];
  places: PreachingPlace[];
  publishers: UserProfile[];
  territories: Territory[];
  onSaveAssignment: (assignment: WeeklyAssignment) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
}

export const WeeklyProgramView: React.FC<WeeklyProgramViewProps> = ({
  congregation,
  assignments,
  places,
  publishers,
  territories,
  onSaveAssignment,
  onDeleteAssignment,
}) => {
  const { currentUser } = useAuth();
  const canEdit = canManagePreachingOperations(currentUser?.role);

  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterActivityType, setFilterActivityType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WeeklyAssignment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrado y ordenación
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        const matchesSearch =
          item.placeName.toLowerCase().includes(search.toLowerCase()) ||
          item.leaderName.toLowerCase().includes(search.toLowerCase()) ||
          (item.territoryNumber && item.territoryNumber.includes(search));

        if (!matchesSearch) return false;

        if (filterMonth !== 'all' && !item.date.startsWith(filterMonth)) {
          return false;
        }

        if (filterActivityType !== 'all') {
          const itemType = item.activityType || 'TERRITORIO';
          if (itemType !== filterActivityType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const cmp = a.date.localeCompare(b.date);
        return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
      });
  }, [assignments, search, filterMonth, filterActivityType]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: WeeklyAssignment) => {
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
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Planificación</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Programa Semanal de Predicación
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reuniones para el servicio del campo, lugares de salida y encargados
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pdfGenerator.generateWeeklyProgramPdf(congregation, filteredAssignments)
            }
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Exportar PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              imageGenerator.generateWeeklyProgramImage(congregation, filteredAssignments)
            }
          >
            <ImageIcon className="w-4 h-4 mr-1.5" />
            Exportar Imagen
          </Button>

          {canEdit && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Asignación
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por lugar, encargado o territorio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">Modalidad:</span>
            <select
              value={filterActivityType}
              onChange={(e) => setFilterActivityType(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="all">Todas las modalidades</option>
              <option value="TERRITORIO">Casa en casa (Territorio)</option>
              <option value="RURAL">🌲 Predicación Rural</option>
              <option value="CALLES">🚶 Por las calles</option>
              <option value="ZOOM">💻 Por Zoom</option>
              <option value="CARTAS">✉️ Cartas / Teléfono</option>
              <option value="GIRA">🚐 Gira de Predicación</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">Mes:</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="all">Todos los meses</option>
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-12">Diciembre 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista / Tabla de Asignaciones */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-6 h-6" />}
          title="No hay asignaciones registradas"
          description={
            search || filterMonth !== 'all'
              ? 'No se encontraron asignaciones que coincidan con los filtros aplicados.'
              : 'Aún no se han programado salidas de predicación. Comienza creando la primera asignación semanal.'
          }
          actionText={canEdit ? 'Programar Primera Salida' : undefined}
          onAction={canEdit ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Día / Fecha y Hora</th>
                  <th className="py-3 px-4">Lugar de Salida</th>
                  <th className="py-3 px-4">Encargado</th>
                  <th className="py-3 px-4">Modalidad / Territorio</th>
                  <th className="py-3 px-4">Notas</th>
                  {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAssignments.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {getDayOfWeekName(item.date) || 'Salida'}
                          </span>
                          {item.activityType === 'RURAL' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🌲 Rural
                            </span>
                          )}
                          {item.activityType === 'CALLES' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🚶 Calles
                            </span>
                          )}
                          {item.activityType === 'ZOOM' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              💻 Zoom
                            </span>
                          )}
                          {item.activityType === 'CARTAS' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              ✉️ Cartas
                            </span>
                          )}
                          {item.activityType === 'GIRA' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              🚐 Gira
                            </span>
                          )}
                          {item.hasConflict && (
                            <span
                              title="Posible conflicto de horario detectado"
                              className="text-amber-600"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {item.date} · {item.time}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {item.placeName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {item.leaderName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {item.activityType === 'CALLES' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md font-medium">
                          🚶 Sin tarjeta (Por las calles)
                        </span>
                      ) : item.activityType === 'ZOOM' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-1 rounded-md font-medium">
                          💻 Sin tarjeta (Reunión Zoom)
                        </span>
                      ) : item.activityType === 'CARTAS' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-800 bg-purple-50 border border-purple-200 px-2 py-1 rounded-md font-medium">
                          ✉️ Sin tarjeta (Cartas / Tel.)
                        </span>
                      ) : item.activityType === 'GIRA' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md font-medium">
                          🚐 Sin tarjeta (Gira de Predicación)
                        </span>
                      ) : item.activityType === 'RURAL' ? (
                        <div>
                          {item.territoryNumber ? (
                            <>
                              <span className="font-semibold text-emerald-950 block">
                                Territorio Rural #{item.territoryNumber}
                              </span>
                              {(() => {
                                const terr = territories.find(
                                  (t) =>
                                    t.id === item.territoryId ||
                                    t.number === item.territoryNumber
                                );
                                if (!terr?.lastProgress) return null;
                                return (
                                  <div
                                    className="text-[11px] text-emerald-700 font-medium truncate max-w-[220px]"
                                    title={`Dónde quedó: ${terr.lastProgress}`}
                                  >
                                    📌 Quedó: {terr.lastProgress}
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-medium">
                              🌲 Territorio Rural (General)
                            </span>
                          )}
                        </div>
                      ) : item.territoryNumber ? (
                        <div>
                          <span className="font-medium text-slate-800">
                            Territorio #{item.territoryNumber}
                          </span>
                          {(() => {
                            const terr = territories.find(
                              (t) =>
                                t.id === item.territoryId ||
                                t.number === item.territoryNumber
                            );
                            if (!terr?.lastProgress) return null;
                            return (
                              <div
                                className="text-[11px] text-blue-700 font-medium truncate max-w-[220px]"
                                title={`Dónde quedó: ${terr.lastProgress}${
                                  terr.lastProgressDate
                                    ? ` (${terr.lastProgressDate})`
                                    : ''
                                }`}
                              >
                                📌 Quedó: {terr.lastProgress}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Por asignar</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {item.notes || '—'}
                    </td>

                    {canEdit && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                            title="Editar asignación"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Crear / Editar */}
      {modalOpen && (
        <AssignmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={onSaveAssignment}
          initialData={editingItem}
          places={places}
          publishers={publishers}
          territories={territories}
          existingAssignments={assignments}
        />
      )}

      {/* Confirmación para Eliminar */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Asignación Semanal"
        message="¿Estás seguro de que deseas eliminar esta asignación del programa? La acción quedará registrada en la bitácora."
        confirmText="Eliminar Asignación"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
