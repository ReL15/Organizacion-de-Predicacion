import React, { useEffect, useState } from 'react';
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
  Lock,
  MapPin,
  Building2,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { CoordinatePickerMap } from '../map/CoordinatePickerMap';

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
  const { currentUser, changePassword, requestPasswordRecovery } = useAuth();
  const isCoordinator = canManageCongregation(currentUser?.role) || Boolean(currentUser?.isMasterAdmin);

  const [name, setName] = useState(congregation.name);
  const [circuit, setCircuit] = useState(congregation.circuit || '');
  const [city, setCity] = useState(congregation.city || '');
  const [address, setAddress] = useState(congregation.address || '');
  const [latitude, setLatitude] = useState<number | undefined>(congregation.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(congregation.longitude);
  const [gpsMessage, setGpsMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState(congregation.logoUrl || '');
  const [timezone, setTimezone] = useState(congregation.timezone || 'America/El_Salvador');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [logoError, setLogoError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  useEffect(() => {
    setName(congregation.name);
    setCircuit(congregation.circuit || '');
    setCity(congregation.city || '');
    setAddress(congregation.address || '');
    setLatitude(congregation.latitude);
    setLongitude(congregation.longitude);
    setLogoUrl(congregation.logoUrl || '');
    setTimezone(congregation.timezone || 'America/El_Salvador');
  }, [congregation]);

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

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setGpsMessage('Ubicación GPS capturada con éxito desde tu dispositivo.');
        setTimeout(() => setGpsMessage(''), 4000);
      },
      (err) => {
        alert(`No se pudo obtener el GPS: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await onUpdateSettings({
        name: name.trim(),
        circuit: circuit.trim() || undefined,
        city: city.trim(),
        address: address.trim() || undefined,
        latitude: latitude !== undefined && !isNaN(latitude) ? latitude : undefined,
        longitude: longitude !== undefined && !isNaN(longitude) ? longitude : undefined,
        logoUrl,
        timezone,
      });
      setSuccessMessage('Ajustes de la congregación y Salón del Reino guardados correctamente.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(`Error guardando ajustes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('El logo debe ser una imagen PNG o JPEG.');
      event.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setLogoError('El logo no debe superar 1 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setLogoUrl(reader.result);
    };
    reader.onerror = () => setLogoError('No se pudo leer el archivo del logo.');
    reader.readAsDataURL(file);
    event.target.value = '';
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

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Tu contraseña se actualizó correctamente.');
    } catch (err: any) {
      const code = err?.code;
      const message =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'La contraseña actual no es correcta.'
          : code === 'auth/weak-password'
          ? 'La nueva contraseña debe tener al menos 6 caracteres.'
          : err?.message || 'No se pudo cambiar la contraseña.';
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!currentUser?.email) {
      setPasswordError('No encontramos el correo de esta cuenta.');
      return;
    }
    setPasswordError('');
    setPasswordMessage('');
    setIsSendingRecovery(true);
    try {
      await requestPasswordRecovery(currentUser.email);
      setPasswordMessage(`Enviamos un enlace para restablecer la contraseña a ${currentUser.email}.`);
    } catch (err: any) {
      setPasswordError(err?.message || 'No se pudo enviar el enlace de recuperación.');
    } finally {
      setIsSendingRecovery(false);
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

      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Lock className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Seguridad de la cuenta</h2>
        </div>
        <p className="text-xs text-slate-600">
          Cambia la contraseña de tu propia cuenta ({currentUser?.email}). Se te pedirá la contraseña actual para confirmar el cambio.
        </p>
        {passwordMessage && (
          <p role="status" className="p-3 text-xs bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            {passwordMessage}
          </p>
        )}
        {passwordError && (
          <p role="alert" className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {passwordError}
          </p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" isLoading={isChangingPassword}>
              Actualizar contraseña
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasswordRecovery}
              isLoading={isSendingRecovery}
            >
              No recuerdo la actual: enviar enlace
            </Button>
          </div>
        </form>
      </section>

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
              <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                Dirección física del Salón del Reino
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Final 4.ª Calle Poniente #24, Col. Utila, Santa Tecla"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Dirección física oficial del Salón del Reino que sirve de referencia para la congregación.
              </p>
            </div>

            {/* Ubicación GPS del Salón del Reino */}
            <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    Ubicación GPS del Salón del Reino
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetCurrentGps}
                    className="text-[11px] py-1 h-7"
                    title="Obtener coordenadas GPS del dispositivo actual"
                  >
                    <Navigation className="w-3 h-3 mr-1 text-blue-600" />
                    GPS de mi dispositivo
                  </Button>

                  {latitude && longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-[11px] text-blue-700 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3 mr-0.5" />
                      Google Maps
                    </a>
                  )}
                </div>
              </div>

              {gpsMessage && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                  {gpsMessage}
                </p>
              )}

              <CoordinatePickerMap
                value={{
                  latitude: latitude || 0,
                  longitude: longitude || 0,
                }}
                onChange={(pt) => {
                  setLatitude(pt.latitude);
                  setLongitude(pt.longitude);
                }}
                label="Haz clic en el mapa de Google Maps para colocar la ubicación exacta del Salón del Reino"
                city={city}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ciudad o Municipio
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Santa Tecla, La Libertad"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Municipio de referencia de la congregación.
              </p>
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

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Logo para programas PDF (PNG o JPEG, máximo 1 MB)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoFile}
                className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
              />
              {logoError && <p className="mt-1 text-xs text-rose-700">{logoError}</p>}
              {logoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={logoUrl} alt="Vista previa del logo" className="h-14 max-w-36 object-contain border rounded p-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogoUrl('')}>
                    Quitar logo
                  </Button>
                </div>
              )}
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
