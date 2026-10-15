import React from 'react';
import {
  Congregation,
  UserProfile,
  WeeklyAssignment,
  PublicPreachingAssignment,
  Territory,
  ViewTab,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  MapPin,
  Share2,
  Map,
  FileDown,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '../common/Button';
import { pdfGenerator } from '../../services/pdfGenerator';
import { imageGenerator } from '../../services/imageGenerator';
import { getDayOfWeekName } from '../../lib/dateUtils';

interface DashboardHomeProps {
  congregation: Congregation;
  weeklyAssignments: WeeklyAssignment[];
  publicAssignments: PublicPreachingAssignment[];
  territories: Territory[];
  onNavigate: (tab: ViewTab) => void;
  onNewWeeklyAssignment: () => void;
  onNewPublicAssignment: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  congregation,
  weeklyAssignments,
  publicAssignments,
  territories,
  onNavigate,
  onNewWeeklyAssignment,
  onNewPublicAssignment,
}) => {
  const {
    currentUser,
    isMasterAdmin,
    availableCongregations,
    activeCongregationId,
    switchCongregation,
  } = useAuth();

  // Próximos turnos personales del usuario activo
  const myWeekly = weeklyAssignments
    .filter((a) => a.leaderId === currentUser?.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const myPublic = publicAssignments
    .filter((p) => p.participants.some((part) => part.userId === currentUser?.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Próximas salidas generales ordenadas
  const upcomingWeekly = [...weeklyAssignments]
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
    })
    .slice(0, 4);

  // Estadísticas clave de territorios
  const availableTerritoriesCount = territories.filter(
    (t) => t.status === 'DISPONIBLE' && t.active
  ).length;
  const inProgressTerritoriesCount = territories.filter(
    (t) => (t.status === 'EN_PROCESO' || t.status === 'ASIGNADO') && t.active
  ).length;

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida y Contexto */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Panel Principal</span>
            {isMasterAdmin && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                ★ Usuario Maestro
              </span>
            )}
          </div>
          {isMasterAdmin ? (
            <div className="mt-1 flex items-center gap-2">
              <select
                value={activeCongregationId}
                onChange={(e) => switchCongregation(e.target.value)}
                className="text-lg md:text-xl font-bold text-slate-900 tracking-tight bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {availableCongregations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {congregation.name}
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
            <span>{congregation.circuit || 'Circuito Regular'}</span>
            <span aria-hidden="true">·</span>
            <span>Zona {congregation.timezone}</span>
            <span aria-hidden="true">·</span>
            <span>Usuario: {currentUser?.fullName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pdfGenerator.generateWeeklyProgramPdf(congregation, weeklyAssignments)
            }
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Descargar Programa PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              imageGenerator.generateWeeklyProgramImage(congregation, weeklyAssignments)
            }
          >
            <ImageIcon className="w-4 h-4 mr-1.5" />
            Exportar Imagen
          </Button>
          {currentUser?.role !== 'PUBLICADOR' && (
            <Button size="sm" onClick={onNewWeeklyAssignment}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Salida
            </Button>
          )}
        </div>
      </div>

      {/* Mis Próximos Turnos (Crucial para teléfonos móviles y publicadores) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Mis Próximos Turnos Asignados
            </h2>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {myWeekly.length + myPublic.length} turnos
          </span>
        </div>

        {myWeekly.length === 0 && myPublic.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
            No tienes turnos asignados actualmente. Consulta el programa general abajo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myWeekly.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">
                        {getDayOfWeekName(item.date) || 'Salida de Predicación'}
                      </span>
                      {item.activityType === 'RURAL' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🌲 Rural
                        </span>
                      )}
                      {item.activityType === 'CALLES' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          🚶 Calles
                        </span>
                      )}
                      {item.activityType === 'ZOOM' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          💻 Zoom
                        </span>
                      )}
                      {item.activityType === 'CARTAS' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          ✉️ Cartas
                        </span>
                      )}
                      {item.activityType === 'GIRA' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                          🚐 Gira
                        </span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums text-[11px]">
                      {item.date} · {item.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.placeName}</h3>
                  {item.activityType === 'CALLES' ? (
                    <span className="text-xs text-amber-800 mt-1 block font-medium">
                      🚶 Sin tarjeta (Predicación por las calles)
                    </span>
                  ) : item.activityType === 'ZOOM' ? (
                    <span className="text-xs text-sky-800 mt-1 block font-medium">
                      💻 Sin tarjeta (Predicación por Zoom)
                    </span>
                  ) : item.activityType === 'CARTAS' ? (
                    <span className="text-xs text-purple-800 mt-1 block font-medium">
                      ✉️ Sin tarjeta (Cartas y Teléfono)
                    </span>
                  ) : item.activityType === 'GIRA' ? (
                    <span className="text-xs text-teal-800 mt-1 block font-medium">
                      🚐 Sin tarjeta (Gira de Predicación)
                    </span>
                  ) : item.activityType === 'RURAL' ? (
                    <span className="text-xs text-emerald-900 mt-1 block font-medium">
                      🌲 {item.territoryNumber ? `Territorio Rural #${item.territoryNumber}` : 'Salida Rural General'}
                    </span>
                  ) : item.territoryNumber ? (
                    <span className="text-xs text-slate-600 mt-1 block">
                      Territorio #{item.territoryNumber}
                    </span>
                  ) : null}
                  {item.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}

            {myPublic.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-sky-800 mb-1">
                    <span className="font-semibold">Predicación Pública (Carrito)</span>
                    <span className="font-mono tabular-nums">
                      {item.date} · {item.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.placeName}</h3>
                  <div className="text-xs text-slate-600 mt-1">
                    <span>Compañeros: </span>
                    <span className="font-medium">
                      {item.participants
                        .filter((p) => p.userId !== currentUser?.id)
                        .map((p) => p.userName)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas de la Congregación (Sin pills estáticos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div
          onClick={() => onNavigate('programa')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs">Programa</span>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums block">
            {weeklyAssignments.length}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Salidas planificadas</span>
        </div>

        <div
          onClick={() => onNavigate('territorios')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <Map className="w-4 h-4" />
            <span className="text-xs">Disponibles</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums block">
            {availableTerritoriesCount}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Territorios listos</span>
        </div>

        <div
          onClick={() => onNavigate('territorios')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">En Avance</span>
          </div>
          <span className="text-2xl font-bold text-amber-600 tabular-nums block">
            {inProgressTerritoriesCount}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">En trabajo activo</span>
        </div>

        <div
          onClick={() => onNavigate('publica')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <Share2 className="w-4 h-4" />
            <span className="text-xs">Carritos</span>
          </div>
          <span className="text-2xl font-bold text-sky-600 tabular-nums block">
            {publicAssignments.length}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Turnos de carritos</span>
        </div>
      </div>

      {/* Próximas Salidas de la Semana */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Próximas Salidas Semanales
            </h2>
            <p className="text-xs text-slate-500">Reuniones para el servicio del campo</p>
          </div>
          <button
            onClick={() => onNavigate('programa')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
          >
            Ver programa completo
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingWeekly.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
            No hay salidas registradas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingWeekly.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      {item.placeName}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>Encargado: {item.leaderName}</span>
                      {item.territoryNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Territorio #{item.territoryNumber}</span>
                        </>
                      )}
                      {item.activityType === 'GIRA' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-teal-700 font-medium">🚐 Gira</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <span className="font-semibold text-slate-900 block font-mono tabular-nums">
                    {item.date}
                  </span>
                  <span className="text-slate-500 block font-mono tabular-nums text-[11px]">
                    {item.time} hrs
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
