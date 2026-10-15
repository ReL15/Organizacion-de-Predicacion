import React, { useState } from 'react';
import { PreachingPlace } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManagePreachingOperations } from '../../services/securityRules';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { PlaceModal } from './PlaceModal';
import { MapPin, Plus, Edit2, Search, ExternalLink } from 'lucide-react';

interface PlacesViewProps {
  places: PreachingPlace[];
  onSavePlace: (place: PreachingPlace) => Promise<void>;
  city?: string;
}

export const PlacesView: React.FC<PlacesViewProps> = ({ places, onSavePlace, city }) => {
  const { currentUser } = useAuth();
  const canEdit = canManagePreachingOperations(currentUser?.role);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PreachingPlace | null>(null);

  const filteredPlaces = places.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (place: PreachingPlace) => {
    setEditingItem(place);
    setModalOpen(true);
  };

  const handleToggleActive = async (place: PreachingPlace) => {
    if (!canEdit) return;
    await onSavePlace({
      ...place,
      active: !place.active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Puntos de Encuentro</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lugares de Salida
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Puntos habituales de reunión para la predicación congregacional
          </p>
        </div>

        {canEdit && (
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Lugar
          </Button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Tarjetas de Lugares */}
      {filteredPlaces.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-6 h-6" />}
          title="No hay lugares de salida registrados"
          description="Agrega los puntos habituales donde los publicadores se reúnen para salir a predicar."
          actionText={canEdit ? 'Registrar Lugar' : undefined}
          onAction={canEdit ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between transition-colors ${
                place.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">
                        {place.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {place.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(place)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                      title="Editar lugar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-2">{place.address}</p>

                {place.description && (
                  <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2 rounded-lg">
                    {place.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 hover:underline text-[11px] font-medium"
                >
                  Ver en Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>

                {canEdit && (
                  <button
                    onClick={() => handleToggleActive(place)}
                    className="text-[11px] text-slate-500 hover:text-slate-900"
                  >
                    {place.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PlaceModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={onSavePlace}
          initialData={editingItem}
          city={city}
        />
      )}
    </div>
  );
};
