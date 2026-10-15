import React, { useState, useMemo } from 'react';
import {
  Congregation,
  Territory,
  TerritoryStatus,
  UserProfile,
  PreachingPlace,
  PublicPreachingPlace,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManagePreachingOperations } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TerritoryModal } from './TerritoryModal';
import { TerritoryMap } from '../map/TerritoryMap';
import { pdfGenerator } from '../../services/pdfGenerator';
import {
  Map,
  Plus,
  FileDown,
  Search,
  Layers,
  Edit2,
  CheckCircle2,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

interface TerritoriesViewProps {
  congregation: Congregation;
  territories: Territory[];
  places: PreachingPlace[];
  publicPlaces?: PublicPreachingPlace[];
  publishers: UserProfile[];
  onSaveTerritory: (territory: Territory) => Promise<void>;
}

export const TerritoriesView: React.FC<TerritoriesViewProps> = ({
  congregation,
  territories,
  places,
  publicPlaces = [],
  publishers,
  onSaveTerritory,
}) => {
  const { currentUser } = useAuth();
  const canEdit = canManagePreachingOperations(currentUser?.role);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Territory | null>(null);

  // Filtrado
  const filteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      const matchesSearch =
        t.number.includes(search) ||
        (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
        (t.lastAssignedToName && t.lastAssignedToName.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter !== 'all') {
        return t.status === statusFilter;
      }
      return true;
    });
  }, [territories, search, statusFilter]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: Territory) => {
    setEditingItem(t);
    setModalOpen(true);
  };

  const handleQuickStatusChange = async (t: Territory, newStatus: TerritoryStatus) => {
    if (!canEdit) return;
    const updated: Territory = {
      ...t,
      status: newStatus,
      lastCompletedDate:
        newStatus === 'COMPLETADO'
          ? new Date().toISOString().split('T')[0]
          : t.lastCompletedDate,
    };
    await onSaveTerritory(updated);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Cartografía y Registro</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Territorios de la Congregación
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Límites perimetrales en OpenStreetMap, asignaciones y avance de predicación
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pdfGenerator.generateTerritoriesReportPdf(congregation, filteredTerritories)
            }
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Reporte PDF
          </Button>

          {canEdit && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Territorio
            </Button>
          )}
        </div>
      </div>

      {/* Controles de Vista y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número, nombre o asignado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Segmented control para cambiar vista mapa/lista */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mapa
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="ASIGNADO">Asignados</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="COMPLETADO">Completados</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Vista de Mapa interactivo */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <TerritoryMap
            territories={filteredTerritories}
            places={places}
            publicPlaces={publicPlaces}
            selectedTerritoryId={selectedTerritoryId}
            onSelectTerritory={(id) => setSelectedTerritoryId(id)}
            city={congregation.city}
          />

          {/* Ficha rápida si hay territorio seleccionado */}
          {selectedTerritoryId && (
            (() => {
              const selected = territories.find((t) => t.id === selectedTerritoryId);
              if (!selected) return null;
              return (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Territorio #{selected.number}
                      </span>
                      {selected.name && (
                        <span className="text-xs text-slate-600">· {selected.name}</span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        · Estado: {selected.status}
                      </span>
                    </div>
                    {selected.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
                    )}
                    {selected.lastAssignedToName && (
                      <span className="text-xs text-slate-600 block mt-1">
                        Asignado a: <b>{selected.lastAssignedToName}</b> (desde {selected.lastAssignedDate})
                      </span>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEdit(selected)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      {selected.status !== 'COMPLETADO' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQuickStatusChange(selected, 'COMPLETADO')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Marcar Completado
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Vista de Lista / Cuadrícula */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTerritories.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    Territorio #{item.number}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {item.status}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-slate-800">
                  {item.name || 'Sin nombre asignado'}
                </h3>

                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-400">Asignado a: </span>
                    <span className="font-medium text-slate-800">
                      {item.lastAssignedToName || 'Disponible'}
                    </span>
                  </div>
                  {item.lastAssignedDate && (
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Fecha: {item.lastAssignedDate}
                    </div>
                  )}
                  {item.observations && (
                    <div className="text-[11px] text-slate-500 italic">
                      Nota: {item.observations}
                    </div>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.status !== 'DISPONIBLE' && (
                      <button
                        onClick={() => handleQuickStatusChange(item, 'DISPONIBLE')}
                        className="text-[11px] text-emerald-700 hover:underline font-medium"
                      >
                        Liberar
                      </button>
                    )}
                    {item.status !== 'COMPLETADO' && (
                      <button
                        onClick={() => handleQuickStatusChange(item, 'COMPLETADO')}
                        className="text-[11px] text-purple-700 hover:underline font-medium"
                      >
                        Completar
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                    title="Editar territorio"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TerritoryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={onSaveTerritory}
          initialData={editingItem}
          publishers={publishers}
          allTerritories={territories}
          city={congregation.city}
        />
      )}
    </div>
  );
};
