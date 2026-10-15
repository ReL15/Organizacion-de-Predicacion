import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const bgStyles = {
    success: 'bg-emerald-900 text-emerald-50 border-emerald-700',
    error: 'bg-rose-900 text-rose-50 border-rose-700',
    info: 'bg-slate-900 text-slate-50 border-slate-700',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50">
      <div
        className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border shadow-lg ${
          bgStyles[toast.type]
        } animate-in fade-in slide-in-from-bottom-2 duration-200`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icons[toast.type]}
          <p className="text-xs font-medium leading-snug truncate">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:opacity-80 rounded shrink-0"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
