import React from 'react';
import { ViewTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers, canManageCongregation } from '../../services/securityRules';
import {
  Home,
  CalendarDays,
  Calendar,
  Map,
  MapPin,
  Share2,
  Users,
  Settings,
  Shield,
  Building2,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  congregationName: string;
  timezone: string;
  onOpenNewCongregationModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  congregationName,
  timezone,
  onOpenNewCongregationModal,
}) => {
  const {
    currentUser,
    isMasterAdmin,
    availableCongregations,
    activeCongregationId,
    switchCongregation,
  } = useAuth();
  const canAdminUsers = canManageUsers(currentUser?.role) || isMasterAdmin;
  const canAdminCong = canManageCongregation(currentUser?.role) || isMasterAdmin;

  const navItems = [
    { id: 'inicio' as ViewTab, label: 'Inicio', icon: Home },
    { id: 'programa' as ViewTab, label: 'Programa Semanal', icon: CalendarDays },
    { id: 'calendario' as ViewTab, label: 'Calendario', icon: Calendar },
    { id: 'territorios' as ViewTab, label: 'Territorios', icon: Map },
    { id: 'lugares' as ViewTab, label: 'Lugares de Salida', icon: MapPin },
    { id: 'publica' as ViewTab, label: 'Predicación Pública', icon: Share2 },
  ];

  return (
    <aside
      aria-label="Barra lateral de navegación"
      className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14"
    >
      {/* Contexto de la Congregación */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            {isMasterAdmin ? 'Congregación Activa' : 'Congregación'}
          </span>
          {isMasterAdmin && (
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Maestro
            </span>
          )}
        </div>

        {isMasterAdmin ? (
          <div className="mt-1 space-y-1.5">
            <select
              value={activeCongregationId}
              onChange={(e) => switchCongregation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 truncate"
            >
              {availableCongregations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-mono truncate">{timezone}</span>
              {onOpenNewCongregationModal && (
                <button
                  onClick={onOpenNewCongregationModal}
                  className="text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  Nueva
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {congregationName}
            </h2>
            <span className="text-[11px] text-slate-500 block truncate mt-0.5 font-mono">
              {timezone}
            </span>
          </>
        )}
      </div>

      {/* Enlaces de navegación */}
      <nav aria-label="Menú principal" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Actividades
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {(canAdminUsers || canAdminCong) && (
          <div className="pt-4">
            <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Administración
            </span>
            {canAdminUsers && (
              <button
                onClick={() => onSelectTab('publicadores')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  currentTab === 'publicadores'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">Publicadores</span>
              </button>
            )}
            {canAdminCong && (
              <button
                onClick={() => onSelectTab('configuracion')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  currentTab === 'configuracion'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="truncate">Ajustes y Respaldo</span>
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Pie del sidebar con rol y estado */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-800 block truncate">
              {currentUser?.fullName}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {currentUser?.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
