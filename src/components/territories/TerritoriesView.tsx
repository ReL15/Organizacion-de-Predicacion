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
import { canManagePreachingOperations, canRecordPreachingProgress } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { TerritoryModal } from './TerritoryModal';
import { TerritoryCardModal } from './TerritoryCardModal';
import { TerritoryProgressModal } from './TerritoryProgressModal';
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
  Eye,
  FileText,
  MapPin,
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
  const canRecord = canRecordPreachingProgress(currentUser);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Territory | null>(null);

  // Estados para las nuevas tarjetas y modal de registro de predicación
  const [cardModalTerritory, setCardModalTerritory] = useState<Territory | null>(null);
  const [progressModalTerritory, setProgressModalTerritory] = useState<Territory | null>(null);

  // Filtrado
  const filteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      const matchesSearch =
        t.number.includes(search) ||
        (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
        (t.lastAssignedToName && t.lastAssignedToName.toLowerCase().includes(search.toLowerCase())) ||
        (t.lastProgress && t.lastProgress.toLowerCase().includes(search.toLowerCase()));

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

  const handleOpenCard = (t: Territory) => {
    setCardModalTerritory(t);
  };

  const handleOpenProgress = (t: Territory) => {
    setProgressModalTerritory(t);
  };

  const handleSaveProgress = async (
    territory: Territory,
    progressData: {
      progress: string;
      date: string;
      publisherName: string;
      notes?: string;
      status?: TerritoryStatus;
    }
  ) => {
    const updated: Territory = {
      ...territory,
      lastProgress: progressData.progress,
      lastProgressDate: progressData.date,
      lastProgressPublisher: progressData.publisherName,
      status: progressData.status || territory.status,
      observations: progressData.notes?.trim()
        ? territory.observations
          ? `${territory.observations} · ${progressData.notes.trim()}`
          : progressData.notes.trim()
        : territory.observations,
      lastCompletedDate:
        progressData.status === 'COMPLETADO'
          ? progressData.date
          : territory.lastCompletedDate,
    };

    await onSaveTerritory(updated);
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
            Límites perimetrales en Google Maps, tarjetas de territorio y registro de predicación
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
            placeholder="Buscar por número, nombre o dónde quedó..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Mapa Google
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Tarjetas ({filteredTerritories.length})
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
                    {selected.lastProgress && (
                      <div className="text-xs text-blue-700 font-medium mt-1">
                        📌 Dónde quedó: {selected.lastProgress}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleOpenCard(selected)}>
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Ver tarjeta
                    </Button>

                    {canRecord && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenProgress(selected)}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Registro de Predicación
                      </Button>
                    )}

                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => handleOpenEdit(selected)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Vista de Lista / Cuadrícula de Tarjetas de Territorio */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTerritories.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    Territorio #{item.number}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'DISPONIBLE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'ASIGNADO'
                        ? 'bg-blue-50 text-blue-700'
                        : item.status === 'EN_PROCESO'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
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

                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div>
                    <span className="text-slate-400">Asignado a: </span>
                    <span className="font-medium text-slate-800">
                      {item.lastAssignedToName || 'Disponible'}
                    </span>
                  </div>

                  {item.lastAssignedDate && (
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Fecha de asignación: {item.lastAssignedDate}
                    </div>
                  )}

                  {/* Dónde quedó el territorio */}
                  {item.lastProgress ? (
                    <div className="p-2 bg-blue-50/80 rounded-md border border-blue-100 text-[11px] text-blue-900 leading-snug">
                      <span className="font-semibold block text-blue-950">📌 Dónde quedó:</span>
                      <span>{item.lastProgress}</span>
                      {item.lastProgressDate && (
                        <span className="block text-[10px] text-blue-600 mt-0.5">
                          {item.lastProgressDate} {item.lastProgressPublisher ? `· ${item.lastProgressPublisher}` : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Sin registro de dónde quedó aún
                    </div>
                  )}

                  {item.observations && (
                    <div className="text-[11px] text-slate-500 italic">
                      Nota: {item.observations}
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción en la tarjeta: Ver tarjeta, Registro de Predicación y Acciones rápidas */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5">
                  {/* Botón 1: Ver tarjeta (Para que los publicadores puedan ver la tarjeta) */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCard(item)}
                    className="flex-1 text-xs py-1 h-8 justify-center font-medium"
                    title="Ver la tarjeta digital del territorio"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    Ver tarjeta
                  </Button>

                  {/* Botón 2: Registro de Predicación (Solo para quienes tienen el privilegio de dirigir) */}
                  {canRecord && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenProgress(item)}
                      className="flex-1 text-xs py-1 h-8 justify-center font-medium text-blue-700 border-blue-200 hover:bg-blue-50"
                      title="Anotar dónde quedó el territorio para el programa de predicación"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Registro
                    </Button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                      title="Editar límites y detalles del territorio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <span className="text-[10px] text-slate-400">Estado rápido:</span>
                    <div className="flex items-center gap-2">
                      {item.status !== 'DISPONIBLE' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'DISPONIBLE')}
                          className="text-emerald-700 hover:underline font-medium"
                        >
                          Liberar
                        </button>
                      )}
                      {item.status !== 'COMPLETADO' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'COMPLETADO')}
                          className="text-purple-700 hover:underline font-medium"
                        >
                          Completar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para editar límites y datos generales del territorio */}
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

      {/* Modal 1: Ver tarjeta del territorio (Para publicadores) */}
      {cardModalTerritory && (
        <TerritoryCardModal
          isOpen={Boolean(cardModalTerritory)}
          onClose={() => setCardModalTerritory(null)}
          territory={cardModalTerritory}
          congregation={congregation}
          places={places}
          canRecordProgress={canRecord}
          onOpenProgressModal={canRecord ? (t) => setProgressModalTerritory(t) : undefined}
        />
      )}

      {/* Modal 2: Registro de Predicación (Anotar dónde quedó el territorio) */}
      {progressModalTerritory && (
        <TerritoryProgressModal
          isOpen={Boolean(progressModalTerritory)}
          onClose={() => setProgressModalTerritory(null)}
          territory={progressModalTerritory}
          currentUser={currentUser}
          publishers={publishers}
          onSaveProgress={handleSaveProgress}
        />
      )}
    </div>
  );
};
