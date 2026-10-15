/**
 * Generador de documentos PDF oficiales para la congregación
 * Utiliza jsPDF para maquetar tablas legibles e imprimibles en español
 */

import { jsPDF } from 'jspdf';
import {
  Congregation,
  WeeklyAssignment,
  PublicPreachingAssignment,
  Territory,
} from '../types';
import { getDayOfWeekName } from '../lib/dateUtils';

function addCongregationLogo(doc: jsPDF, congregation: Congregation): void {
  const logo = congregation.logoUrl;
  if (!logo?.startsWith('data:image/')) return;
  const format = logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  doc.addImage(logo, format, 14, 5, 18, 18, undefined, 'FAST');
}

export const pdfGenerator = {
  /**
   * Genera el PDF del Programa Semanal de Predicación
   */
  generateWeeklyProgramPdf(
    congregation: Congregation,
    assignments: WeeklyAssignment[]
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Encabezado
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 28, 'F');
    addCongregationLogo(doc, congregation);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(
      'PROGRAMA DE REUNIONES PARA EL SERVICIO DEL CAMPO',
      congregation.logoUrl ? margin + 23 : margin,
      12
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const subheader = `${congregation.name} ${congregation.circuit ? `· Circuito: ${congregation.circuit}` : ''} · Zona: ${congregation.timezone}`;
    doc.text(subheader, congregation.logoUrl ? margin + 23 : margin, 20);

    // Metadata
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    const genDate = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Documento generado el: ${genDate}`, margin, 35);

    // Tabla de asignaciones
    let y = 42;
    doc.setDrawColor(226, 232, 240);

    // Cabecera de la tabla
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    doc.text('Día / Fecha / Hora', margin + 3, y + 5.5);
    doc.text('Lugar de Salida', margin + 45, y + 5.5);
    doc.text('Encargado', margin + 98, y + 5.5);
    doc.text('Territorio / Modalidad', margin + 138, y + 5.5);

    y += 9;

    // Ordenar por fecha y hora
    const sorted = [...assignments].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
    });

    if (sorted.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('No hay salidas de predicación programadas en este período.', margin + 3, y + 6);
    } else {
      sorted.forEach((item, index) => {
        const rowHeight = item.notes ? 17 : 14;

        // Paginación si excede el tamaño
        if (y + rowHeight > 275) {
          doc.addPage();
          y = 20;
        }

        const isAlt = index % 2 === 1;
        if (isAlt) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
        }

        // Columna 1: Día destacado y fecha/hora
        const dayName = getDayOfWeekName(item.date) || 'Salida';
        const [yStr, mStr, dStr] = item.date.split('-');
        const dateFormatted = dStr && mStr ? `${dStr}/${mStr}/${yStr}` : item.date;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(dayName, margin + 3, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`${dateFormatted} · ${item.time}`, margin + 3, y + 9.5);

        // Columna 2: Lugar de Salida
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(doc.splitTextToSize(item.placeName, 48), margin + 45, y + 5);

        // Columna 3: Encargado
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(doc.splitTextToSize(item.leaderName, 36), margin + 98, y + 5);

        // Columna 4: Modalidad y Territorio
        if (item.activityType === 'RURAL') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(5, 150, 105); // emerald-600
          doc.text('[RURAL]', margin + 138, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const terrDesc = item.territoryNumber
            ? `Terr. #${item.territoryNumber}`
            : 'Territorio Rural';
          doc.text(terrDesc, margin + 138, y + 9.5);
        } else if (item.activityType === 'CALLES') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(180, 83, 9); // amber-700
          doc.text('Por las Calles', margin + 138, y + 5);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('(Sin tarjeta)', margin + 138, y + 9);
        } else if (item.activityType === 'ZOOM') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(2, 132, 199); // sky-600
          doc.text('Por Zoom', margin + 138, y + 5);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('(Sin tarjeta)', margin + 138, y + 9);
        } else if (item.activityType === 'CARTAS') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(126, 34, 206); // purple-700
          doc.text('Cartas / Teléfono', margin + 138, y + 5);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('(Sin tarjeta)', margin + 138, y + 9);
        } else if (item.activityType === 'GIRA') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(13, 148, 136); // teal-600
          doc.text('Gira de Predicación', margin + 138, y + 5);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('(Sin tarjeta)', margin + 138, y + 9);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          const terrText = item.territoryNumber ? `Terr. #${item.territoryNumber}` : 'Por asignar';
          doc.text(terrText, margin + 138, y + 5.5);
        }

        if (item.notes) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Nota: ${item.notes.substring(0, 80)}`, margin + 3, y + 14);
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
        y += rowHeight + 1;
      });
    }

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Programa de Predicación · Página ${i} de ${totalPages}`,
        pageWidth / 2,
        288,
        { align: 'center' }
      );
    }

    doc.save(`Programa_Predicacion_${congregation.name.replace(/\s+/g, '_')}.pdf`);
  },

  /**
   * Genera el PDF del programa de Predicación Pública (Carritos)
   */
  generatePublicPreachingPdf(
    congregation: Congregation,
    assignments: PublicPreachingAssignment[]
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFillColor(15, 76, 129); // color distintivo
    doc.rect(0, 0, pageWidth, 28, 'F');
    addCongregationLogo(doc, congregation);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(
      'TURNO DE PREDICACIÓN PÚBLICA ESPECIAL (CARRITOS)',
      congregation.logoUrl ? margin + 23 : margin,
      12
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `${congregation.name} · Asignaciones con 2 o 3 participantes`,
      congregation.logoUrl ? margin + 23 : margin,
      20
    );

    let y = 38;
    const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((item, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageWidth - margin * 2, 22, 'S');

      const dayName = getDayOfWeekName(item.date);
      const [yStr, mStr, dStr] = item.date.split('-');
      const dateFormatted = dStr && mStr ? `${dStr}/${mStr}/${yStr}` : item.date;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${dayName ? `${dayName} ` : ''}${dateFormatted} · ${item.time} (${item.duration} min)`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Punto: ${item.placeName}`, margin + 4, y + 11);

      // Participantes
      const names = item.participants.map((p) => p.userName + (p.isFixed ? ' (Fijo)' : '')).join(', ');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 76, 129);
      doc.text(`Participantes (${item.participants.length}): ${names}`, margin + 4, y + 16);

      if (item.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Observación: ${item.notes}`, margin + 4, y + 20);
      }

      y += 25;
    });

    doc.save(`Predicacion_Publica_${congregation.name.replace(/\s+/g, '_')}.pdf`);
  },

  /**
   * Genera el reporte general de Territorios de la Congregación
   */
  generateTerritoriesReportPdf(
    congregation: Congregation,
    territories: Territory[]
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 28, 'F');
    addCongregationLogo(doc, congregation);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(
      'REGISTRO Y ESTADO DE TERRITORIOS',
      congregation.logoUrl ? margin + 23 : margin,
      12
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `${congregation.name} · Resumen de asignación y avance`,
      congregation.logoUrl ? margin + 23 : margin,
      20
    );

    let y = 40;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    doc.text('Núm.', margin + 3, y + 5.5);
    doc.text('Nombre / Sector', margin + 18, y + 5.5);
    doc.text('Estado', margin + 85, y + 5.5);
    doc.text('Asignado a', margin + 120, y + 5.5);
    doc.text('Últ. Fecha', margin + 160, y + 5.5);

    y += 9;

    territories.forEach((t, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - margin * 2, 9, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${t.number}`, margin + 3, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text((t.name || 'Sin nombre').substring(0, 32), margin + 18, y + 6);
      doc.text(t.status, margin + 85, y + 6);
      doc.text(t.lastAssignedToName || '—', margin + 120, y + 6);
      doc.text(t.lastAssignedDate || t.lastCompletedDate || '—', margin + 160, y + 6);

      if (t.lastProgress) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 64, 175);
        doc.text(`Quedó: ${t.lastProgress.substring(0, 65)}`, margin + 18, y + 10);
        y += 14;
      } else {
        y += 10;
      }
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Programa de Predicación · Página ${i} de ${totalPages}`,
        pageWidth / 2,
        288,
        { align: 'center' }
      );
    }

    doc.save(`Territorios_${congregation.name.replace(/\s+/g, '_')}.pdf`);
  },
};
