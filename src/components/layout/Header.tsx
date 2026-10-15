import React from 'react';
import { ViewTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers } from '../../services/securityRules';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  congregationName?: string;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  congregationName = 'Santa Tecla Norte',
  onOpenAuthModal,
}) => {
  const { currentUser, logout } = useAuth();
  const canAdminUsers = canManageUsers(currentUser?.role);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between gap-8 px-4 sm:px-6 h-14 max-w-7xl mx-auto">
        {/* Zona 1: Brand wordmark (un solo elemento de texto, sin pills o subtítulos) */}
        <button
          onClick={() => onSelectTab('inicio')}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-slate-700 transition-colors"
        >
          Programa de Predicación
        </button>

        {/* Zona 2: Enlaces limpios para escritorio */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            onClick={() => onSelectTab('inicio')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
              currentTab === 'inicio' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => onSelectTab('programa')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
              currentTab === 'programa' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Programa
          </button>
          <button
            onClick={() => onSelectTab('calendario')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
              currentTab === 'calendario' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => onSelectTab('territorios')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
              currentTab === 'territorios' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Territorios
          </button>
          <button
            onClick={() => onSelectTab('publica')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
              currentTab === 'publica' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            Pública
          </button>
        </nav>

        {/* Zona 3: Acción primaria / Usuario activo con metadatos limpios */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="text-right hidden sm:block">
                <span className="font-semibold text-slate-900 block leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[11px] text-slate-500">
                  {currentUser.role.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
