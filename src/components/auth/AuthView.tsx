import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Lock, Mail, User, ShieldCheck } from 'lucide-react';

interface AuthViewProps {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ isModal = false, isOpen = true, onClose }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    requestPasswordRecovery,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  if (isModal && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        if (onClose) onClose();
      } else if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Ingresa tu nombre completo.');
        await registerWithEmail(email, password, fullName);
        if (onClose) onClose();
      } else if (mode === 'recovery') {
        await requestPasswordRecovery(email);
        setMessage({
          type: 'success',
          text: 'Se ha enviado un enlace para restablecer tu contraseña.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error durante la autenticación.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error durante la autenticación con Google.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {mode === 'login'
            ? 'Organizador de la Predicación'
            : mode === 'register'
            ? 'Crear Cuenta'
            : 'Recuperar Contraseña'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'login'
            ? 'Acceso para publicadores y coordinadores de congregación'
            : mode === 'register'
            ? 'Registra tu perfil en la congregación activa'
            : 'Introduce tu correo para restablecer la clave'}
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 text-xs rounded-lg border ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Botón de Google OAuth */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Iniciar sesión con Google
        </button>
      </div>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          O con correo
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nombre y Apellido <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Correo Electrónico <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@ejemplo.org"
              required
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {mode !== 'recovery' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Contraseña <span className="text-rose-500">*</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('recovery')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        <Button type="submit" size="sm" className="w-full mt-2" isLoading={isLoading}>
          {mode === 'login'
            ? 'Iniciar Sesión'
            : mode === 'register'
            ? 'Crear Cuenta'
            : 'Enviar Enlace de Recuperación'}
        </Button>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
        {mode === 'login' ? (
          <div>
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => {
                setMode('register');
                setMessage(null);
              }}
              className="font-semibold text-blue-700 hover:underline"
            >
              Registrarse
            </button>
          </div>
        ) : (
          <div>
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => {
                setMode('login');
                setMessage(null);
              }}
              className="font-semibold text-blue-700 hover:underline"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md">{cardContent}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {cardContent}
    </div>
  );
};
