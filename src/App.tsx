/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ViewTab } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiService, CongregationFullData } from './services/apiService';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { AuthView } from './components/auth/AuthView';
import { Toast, ToastMessage } from './components/common/Toast';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Button } from './components/common/Button';

// Vistas
import { DashboardHome } from './components/home/DashboardHome';
import { WeeklyProgramView } from './components/program/WeeklyProgramView';
import { CalendarView } from './components/calendar/CalendarView';
import { TerritoriesView } from './components/territories/TerritoriesView';
import { PlacesView } from './components/places/PlacesView';
import { PublicPreachingView } from './components/publicPreaching/PublicPreachingView';
import { PublishersView } from './components/publishers/PublishersView';
import { SettingsView } from './components/settings/SettingsView';
import { NewCongregationModal } from './components/settings/NewCongregationModal';
import { Building2, LogOut } from 'lucide-react';

function AppContent() {
  const {
    currentUser,
    isLoading: isAuthLoading,
    activeCongregationId,
    refreshCongregations,
    isMasterAdmin,
    isBootstrapAdmin,
    logout,
    refreshUserProfile,
  } = useAuth();

  const [currentTab, setCurrentTab] = useState<ViewTab>('inicio');
  const [data, setData] = useState<CongregationFullData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [newCongModalOpen, setNewCongModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({
        id: String(Date.now()),
        type,
        message,
      });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!currentUser || !currentUser.congregationId) {
      setData(null);
      return;
    }
    setIsLoadingData(true);
    try {
      const result = await apiService.getCongregationData(activeCongregationId || currentUser.congregationId);
      setData(result);
    } catch (err: any) {
      showToast(err.message || 'Error cargando datos de la congregación.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser, activeCongregationId, showToast]);

  useEffect(() => {
    if (currentUser?.congregationId) {
      loadData();
    }
  }, [currentUser?.congregationId, activeCongregationId, loadData]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner label="Conectando con la base de datos..." />
      </div>
    );
  }

  // Si no hay sesión iniciada, mostrar pantalla de login / registro
  if (!currentUser) {
    return <AuthView isModal={false} />;
  }

  // Si el usuario no tiene congregación asociada todavía
  if (!currentUser.congregationId && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>

          <h2 className="text-base font-bold text-slate-900 mb-1">
            {isMasterAdmin || isBootstrapAdmin
              ? 'Inicializar Congregación'
              : 'Cuenta sin Congregación Asignada'}
          </h2>

          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {isMasterAdmin || isBootstrapAdmin
              ? 'Como Coordinador inicial / Usuario Maestro, registra la primera congregación para comenzar a planificar la predicación.'
              : 'Tu cuenta ha sido creada con éxito. Un coordinador debe asignarte a una congregación para que puedas consultar tus turnos.'}
          </p>

          <div className="flex flex-col gap-2">
            {(isMasterAdmin || isBootstrapAdmin) && (
              <Button size="sm" onClick={() => setNewCongModalOpen(true)}>
                Crear Congregación
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {newCongModalOpen && (
          <NewCongregationModal
            isOpen={newCongModalOpen}
            onClose={() => setNewCongModalOpen(false)}
            onCreate={async (newCong) => {
              const created = await apiService.createCongregation(newCong, currentUser);
              await refreshUserProfile();
              await refreshCongregations();
              showToast(`Congregación "${created.name}" creada exitosamente.`);
            }}
          />
        )}
      </div>
    );
  }

  if (isLoadingData && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner label="Cargando registros congregacionales..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center max-w-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            No se pudieron obtener los registros
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Comprueba que el servidor y la base de datos PostgreSQL estén activos.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => loadData()}>
              Reintentar
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar contractual */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        congregationName={data.congregation.name}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-8">
        {/* Barra lateral para pantallas medianas y grandes */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          congregationName={data.congregation.name}
          timezone={data.congregation.timezone}
          onOpenNewCongregationModal={() => setNewCongModalOpen(true)}
        />

        {/* Contenido principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {currentTab === 'inicio' && (
            <DashboardHome
              congregation={data.congregation}
              weeklyAssignments={data.weeklyAssignments}
              publicAssignments={data.publicAssignments}
              territories={data.territories}
              onNavigate={setCurrentTab}
              onNewWeeklyAssignment={() => setCurrentTab('programa')}
              onNewPublicAssignment={() => setCurrentTab('publica')}
            />
          )}

          {currentTab === 'programa' && (
            <WeeklyProgramView
              congregation={data.congregation}
              assignments={data.weeklyAssignments}
              places={data.preachingPlaces}
              publishers={data.users}
              territories={data.territories}
              onSaveAssignment={async (assignment) => {
                await apiService.saveWeeklyAssignment(assignment, currentUser);
                await loadData();
                showToast('Asignación semanal guardada en la base de datos.');
              }}
              onDeleteAssignment={async (id) => {
                await apiService.deleteWeeklyAssignment(id, currentUser);
                await loadData();
                showToast('Asignación eliminada.');
              }}
            />
          )}

          {currentTab === 'calendario' && (
            <CalendarView
              congregation={data.congregation}
              weeklyAssignments={data.weeklyAssignments}
              publicAssignments={data.publicAssignments}
            />
          )}

          {currentTab === 'territorios' && (
            <TerritoriesView
              congregation={data.congregation}
              territories={data.territories}
              places={data.preachingPlaces}
              publicPlaces={data.publicPlaces}
              publishers={data.users}
              onSaveTerritory={async (territory) => {
                await apiService.saveTerritory(territory, currentUser);
                await loadData();
                showToast(`Territorio #${territory.number} actualizado.`);
              }}
            />
          )}

          {currentTab === 'lugares' && (
            <PlacesView
              places={data.preachingPlaces}
              city={data.congregation.city}
              onSavePlace={async (place) => {
                await apiService.savePreachingPlace(place, currentUser);
                await loadData();
                showToast('Lugar de salida guardado.');
              }}
            />
          )}

          {currentTab === 'publica' && (
            <PublicPreachingView
              congregation={data.congregation}
              assignments={data.publicAssignments}
              places={data.publicPlaces}
              publishers={data.users}
              onSaveAssignment={async (assignment) => {
                await apiService.savePublicAssignment(assignment, currentUser);
                await loadData();
                showToast('Turno de predicación pública guardado.');
              }}
              onDeleteAssignment={async (id) => {
                await apiService.deletePublicAssignment(id, currentUser);
                await loadData();
                showToast('Turno eliminado.');
              }}
              onSavePlace={async (place) => {
                await apiService.savePublicPlace(place, currentUser);
                await loadData();
                showToast('Punto de predicación pública guardado.');
              }}
              city={data.congregation.city}
            />
          )}

          {currentTab === 'publicadores' && (
            <PublishersView
              publishers={data.users}
              onSavePublisher={async (user) => {
                await apiService.saveUserProfile(user, currentUser);
                await loadData();
                showToast(`Perfil de ${user.fullName} guardado.`);
              }}
              onDeletePublisher={async (user) => {
                await apiService.deleteUserProfile(user.id);
                await loadData();
                showToast(`Publicador ${user.fullName} eliminado.`);
              }}
            />
          )}

          {currentTab === 'configuracion' && (
            <SettingsView
              congregation={data.congregation}
              auditLogs={data.auditLogs}
              onUpdateSettings={async (settings) => {
                await apiService.updateCongregationSettings(settings, currentUser);
                await loadData();
                showToast('Ajustes de la congregación guardados.');
              }}
            />
          )}
        </main>
      </div>

      {/* Navegación móvil inferior (Fija) */}
      <MobileNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Modal para Crear Nueva Congregación (Usuario Maestro) */}
      {newCongModalOpen && currentUser && (
        <NewCongregationModal
          isOpen={newCongModalOpen}
          onClose={() => setNewCongModalOpen(false)}
          onCreate={async (newCong) => {
            const created = await apiService.createCongregation(newCong, currentUser);
            await refreshCongregations();
            await loadData();
            showToast(`Congregación "${created.name}" creada e iniciada.`);
          }}
        />
      )}

      {/* Notificaciones flotantes */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
