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

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PROGRAMA DE REUNIONES PARA EL SERVICIO DEL CAMPO', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const subheader = `${congregation.name} ${congregation.circuit ? `· Circuito: ${congregation.circuit}` : ''} · Zona: ${congregation.timezone}`;
    doc.text(subheader, margin, 20);

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

    doc.text('Fecha / Hora', margin + 3, y + 5.5);
    doc.text('Lugar de Salida', margin + 40, y + 5.5);
    doc.text('Encargado', margin + 95, y + 5.5);
    doc.text('Territorio', margin + 140, y + 5.5);

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
        // Paginación si excede el tamaño
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const isAlt = index % 2 === 1;
        if (isAlt) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - margin * 2, 14, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        // Fecha en formato legible
        doc.text(`${item.date} · ${item.time}`, margin + 3, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(doc.splitTextToSize(item.placeName, 52), margin + 40, y + 5);
        doc.text(item.leaderName, margin + 95, y + 5);

        const terrText = item.territoryNumber ? `Terr. #${item.territoryNumber}` : 'Por asignar';
        doc.text(terrText, margin + 140, y + 5);

        if (item.notes) {
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7.5);
          doc.text(`Nota: ${item.notes.substring(0, 75)}`, margin + 3, y + 10);
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 14, pageWidth - margin, y + 14);
        y += 15;
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
        `Organizador de la Predicación Congregacional · Página ${i} de ${totalPages}`,
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

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TURNO DE PREDICACIÓN PÚBLICA ESPECIAL (CARRITOS)', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${congregation.name} · Asignaciones con 2 o 3 participantes`, margin, 20);

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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${item.date} · ${item.time} (${item.duration} min)`, margin + 4, y + 6);

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

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REGISTRO Y ESTADO DE TERRITORIOS', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${congregation.name} · Resumen de asignación y avance`, margin, 20);

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

      y += 10;
    });

    doc.save(`Territorios_${congregation.name.replace(/\s+/g, '_')}.pdf`);
  },
};
