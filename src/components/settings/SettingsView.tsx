import React, { useState } from 'react';
import { Congregation, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { canManageCongregation } from '../../services/securityRules';
import { Button } from '../common/Button';
import { apiService } from '../../services/apiService';
import {
  Settings,
  Download,
  ShieldCheck,
  Clock,
  History,
  CheckCircle,
} from 'lucide-react';

interface SettingsViewProps {
  congregation: Congregation;
  auditLogs: AuditLog[];
  onUpdateSettings: (settings: Partial<Congregation>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  congregation,
  auditLogs,
  onUpdateSettings,
}) => {
  const { currentUser } = useAuth();
  const isCoordinator = canManageCongregation(currentUser?.role);

  const [name, setName] = useState(congregation.name);
  const [circuit, setCircuit] = useState(congregation.circuit || '');
  const [timezone, setTimezone] = useState(congregation.timezone || 'America/El_Salvador');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isCoordinator) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <h2 className="text-base font-semibold text-slate-900">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 mt-1">
          Solo el Coordinador de la congregación tiene autorización para ver y modificar los ajustes del sistema y respaldos.
        </p>
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await onUpdateSettings({
        name: name.trim(),
        circuit: circuit.trim() || undefined,
        timezone,
      });
      setSuccessMessage('Ajustes de la congregación guardados correctamente.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(`Error guardando ajustes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    try {
      const backupData = await apiService.exportBackup(currentUser);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `Respaldo_${congregation.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(`Error exportando respaldo: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs text-slate-500 font-medium">Administración General</span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
          Configuración y Respaldo de la Congregación
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajustes de zona horaria, exportación de datos y bitácora de auditoría
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Ajustes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Settings className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Datos de la Congregación
            </h2>
          </div>

          {successMessage && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombre de la Congregación
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Circuito Asignado (Opcional)
              </label>
              <input
                type="text"
                value={circuit}
                onChange={(e) => setCircuit(e.target.value)}
                placeholder="Ej: SV-04"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Zona Horaria Oficial
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              >
                <option value="America/El_Salvador">America/El_Salvador (UTC-6)</option>
                <option value="America/Guatemala">America/Guatemala (UTC-6)</option>
                <option value="America/Tegucigalpa">America/Tegucigalpa (UTC-6)</option>
                <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                <option value="America/Bogota">America/Bogota (UTC-5)</option>
                <option value="America/New_York">America/New_York (UTC-5 / UTC-4)</option>
                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (UTC-3)</option>
                <option value="Europe/Madrid">Europe/Madrid (UTC+1 / UTC+2)</option>
              </select>
            </div>

            <Button type="submit" size="sm" isLoading={isSaving}>
              Guardar Cambios
            </Button>
          </form>
        </div>

        {/* Respaldo y Exportación de Datos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Download className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Respaldo JSON de la Congregación
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Como Coordinador, puedes generar una copia de respaldo completa en formato JSON. El archivo contiene únicamente los datos autorizados pertenecientes a <b>{congregation.name}</b> (territorios, polígonos, salidas, turnos públicos y registros de auditoría).
          </p>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
            <div>Esquema: Version 1.0</div>
            <div>Aislamiento: Verificado por backend</div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            isLoading={isExporting}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Descargar Respaldo JSON
          </Button>
        </div>
      </div>

      {/* Bitácora de Auditoría */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Bitácora de Auditoría Congregacional
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {auditLogs.length} eventos
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            No hay registros de auditoría aún.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Entidad</th>
                  <th className="py-2.5 px-3">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 whitespace-nowrap text-slate-500 tabular-nums text-[11px]">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">
                      {log.userName}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-sans">
                      {log.entity}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-sans truncate max-w-xs">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
