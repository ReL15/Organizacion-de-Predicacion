import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({
  label = 'Cargando información...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
};
