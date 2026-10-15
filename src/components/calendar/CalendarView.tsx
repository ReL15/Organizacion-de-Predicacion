import React, { useState } from 'react';
import {
  WeeklyAssignment,
  PublicPreachingAssignment,
  Congregation,
} from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Share2,
} from 'lucide-react';
import { Button } from '../common/Button';

interface CalendarViewProps {
  congregation: Congregation;
  weeklyAssignments: WeeklyAssignment[];
  publicAssignments: PublicPreachingAssignment[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  congregation,
  weeklyAssignments,
  publicAssignments,
}) => {
  // Año y mes activo
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // Octubre 2026
  const [selectedDayString, setSelectedDayString] = useState<string>('2026-10-10');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Calcular días en el mes
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 domingo ... 6 sábado
  // Ajustar para empezar en Lunes (0 = Lun, 6 = Dom)
  const startingOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Mapear eventos por fecha en string YYYY-MM-DD
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, { weekly: WeeklyAssignment[]; publicShifts: PublicPreachingAssignment[] }> = {};

    weeklyAssignments.forEach((w) => {
      if (!map[w.date]) map[w.date] = { weekly: [], publicShifts: [] };
      map[w.date].weekly.push(w);
    });

    publicAssignments.forEach((p) => {
      if (!map[p.date]) map[p.date] = { weekly: [], publicShifts: [] };
      map[p.date].publicShifts.push(p);
    });

    return map;
  }, [weeklyAssignments, publicAssignments]);

  const selectedDayEvents = eventsByDate[selectedDayString] || {
    weekly: [],
    publicShifts: [],
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Cronograma Integral</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Calendario de Actividades de Predicación
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vista conjunta de salidas de predicación y turnos de carritos públicos
          </p>
        </div>

        {/* Controles de mes */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900 w-36 text-center select-none">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rejilla de Calendario (2 columnas en desktop) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-xs font-semibold text-slate-500 py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="min-h-[75px] md:min-h-[85px] p-1 rounded-lg bg-slate-50/50" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNum = index + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const events = eventsByDate[dateStr];
              const isSelected = selectedDayString === dateStr;
              const hasEvents = events && (events.weekly.length > 0 || events.publicShifts.length > 0);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDayString(dateStr)}
                  className={`min-h-[75px] md:min-h-[85px] p-2 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : hasEvents
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold tabular-nums font-mono ${
                      isSelected ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <div className="space-y-1 w-full mt-1">
                    {events?.weekly.map((w) => (
                      <div
                        key={w.id}
                        className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${
                          isSelected
                            ? 'bg-slate-800 text-slate-200'
                            : 'bg-slate-100 text-slate-800 font-medium'
                        }`}
                        title={`Salida: ${w.placeName} (${w.time})`}
                      >
                        {w.time} {w.placeName}
                      </div>
                    ))}
                    {events?.publicShifts.map((p) => (
                      <div
                        key={p.id}
                        className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${
                          isSelected
                            ? 'bg-sky-800 text-sky-100'
                            : 'bg-sky-50 text-sky-800 font-medium border border-sky-100'
                        }`}
                        title={`Carrito: ${p.placeName} (${p.time})`}
                      >
                        {p.time} Carrito
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel lateral: Detalle del día seleccionado */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Detalle del Día
            </span>
            <h2 className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {selectedDayString}
            </h2>
          </div>

          <div className="space-y-3">
            {/* Salidas semanales */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Salidas de Predicación ({selectedDayEvents.weekly.length})
              </span>
              {selectedDayEvents.weekly.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay salidas para este día.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.weekly.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{item.placeName}</span>
                        <span className="font-mono tabular-nums">{item.time}</span>
                      </div>
                      <div className="text-slate-600">
                        <span>Encargado: </span>
                        <span className="font-medium text-slate-800">{item.leaderName}</span>
                      </div>
                      {item.territoryNumber && (
                        <div className="text-slate-500">
                          Territorio #{item.territoryNumber}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 italic pt-1">{item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Predicación pública */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Predicación Pública / Carritos ({selectedDayEvents.publicShifts.length})
              </span>
              {selectedDayEvents.publicShifts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay turnos públicos para este día.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.publicShifts.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-sky-200 bg-sky-50/30 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{item.placeName}</span>
                        <span className="font-mono tabular-nums">{item.time}</span>
                      </div>
                      <div className="text-slate-600">
                        <span>Participantes: </span>
                        <span className="font-medium text-slate-800">
                          {item.participants.map((p) => p.userName).join(', ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Duración: {item.duration} minutos
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
