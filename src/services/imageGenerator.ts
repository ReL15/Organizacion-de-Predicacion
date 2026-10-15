/**
 * Generador de imágenes del Programa Semanal de Predicación
 * Renderiza una tarjeta de alta resolución (Retina 2x) en HTML5 Canvas para compartir por WhatsApp / Móvil
 */

import { Congregation, WeeklyAssignment } from '../types';
import { getDayOfWeekName } from '../lib/dateUtils';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  let tl = 0;
  let tr = 0;
  let br = 0;
  let bl = 0;

  if (typeof radius === 'number') {
    tl = tr = br = bl = radius;
  } else {
    tl = radius.tl;
    tr = radius.tr;
    br = radius.br;
    bl = radius.bl;
  }

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export const imageGenerator = {
  /**
   * Genera y descarga el programa semanal en formato imagen PNG de alta fidelidad
   */
  async generateWeeklyProgramImage(
    congregation: Congregation,
    assignments: WeeklyAssignment[]
  ): Promise<void> {
    const sorted = [...assignments].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
    });

    const scale = 2; // Factor Retina / Alta resolución
    const canvasWidth = 1180;
    const padding = 28;
    const cardWidth = canvasWidth - padding * 2;

    const headerHeight = 112;
    const subHeaderHeight = 36;
    const tableHeaderHeight = 44;
    const footerHeight = 48;

    // Calcular altura de cada fila según notas
    const rowHeights = sorted.map((item) => (item.notes ? 76 : 56));
    const tableBodyHeight =
      sorted.length > 0
        ? rowHeights.reduce((acc, h) => acc + h, 0)
        : 100; // Estado vacío

    const cardHeight =
      headerHeight + subHeaderHeight + tableHeaderHeight + tableBodyHeight + footerHeight;
    const canvasHeight = cardHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto de imagen 2D.');
    }

    ctx.scale(scale, scale);

    // Fondo global sutil
    ctx.fillStyle = '#f1f5f9'; // slate-100
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Card Container (Sombra y Contenedor Principal)
    const cardX = padding;
    const cardY = padding;

    // Sombra del Card
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Borde exterior
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 16);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Header con gradiente elegante Slate
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, headerHeight, {
      tl: 16,
      tr: 16,
      br: 0,
      bl: 0,
    });
    const headerGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + headerHeight);
    headerGradient.addColorStop(0, '#0f172a'); // slate-900
    headerGradient.addColorStop(1, '#1e293b'); // slate-800
    ctx.fillStyle = headerGradient;
    ctx.fill();
    ctx.restore();

    // Título Principal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PROGRAMA DE REUNIONES PARA EL SERVICIO DEL CAMPO', cardX + 28, cardY + 44);

    // Subtítulo Congregación
    ctx.fillStyle = '#38bdf8'; // sky-400
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(congregation.name.toUpperCase(), cardX + 28, cardY + 70);

    // Metadata de Circuito y Zona
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const circuitInfo = `${congregation.circuit ? `Circuito: ${congregation.circuit}  ·  ` : ''}Zona horaria: ${congregation.timezone}`;
    ctx.fillText(circuitInfo, cardX + 28, cardY + 92);

    // Barra de Sub-Header (Fecha de Generación y Cantidad)
    let currentY = cardY + headerHeight;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cardX, currentY, cardWidth, subHeaderHeight);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, currentY + subHeaderHeight);
    ctx.lineTo(cardX + cardWidth, currentY + subHeaderHeight);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const genDateStr = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`Emitido: ${genDateStr}`, cardX + 28, currentY + 23);

    const totalText = `${sorted.length} salidas programadas`;
    const totalMetrics = ctx.measureText(totalText);
    ctx.fillText(totalText, cardX + cardWidth - 28 - totalMetrics.width, currentY + 23);

    // Cabecera de Tabla
    currentY += subHeaderHeight;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(cardX, currentY, cardWidth, tableHeaderHeight);

    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cardX, currentY + tableHeaderHeight);
    ctx.lineTo(cardX + cardWidth, currentY + tableHeaderHeight);
    ctx.stroke();

    // Columnas
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const colX = {
      day: cardX + 28,
      place: cardX + 220,
      leader: cardX + 500,
      modality: cardX + 740,
    };

    ctx.fillText('DÍA / FECHA Y HORA', colX.day, currentY + 27);
    ctx.fillText('LUGAR DE SALIDA', colX.place, currentY + 27);
    ctx.fillText('ENCARGADO', colX.leader, currentY + 27);
    ctx.fillText('MODALIDAD / TERRITORIO', colX.modality, currentY + 27);

    currentY += tableHeaderHeight;

    // Cuerpo de la Tabla
    if (sorted.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('No hay salidas de predicación programadas en este período.', cardX + 28, currentY + 54);
      currentY += 100;
    } else {
      sorted.forEach((item, index) => {
        const rowH = rowHeights[index];
        const isAlt = index % 2 === 1;

        // Fondo alternante
        if (isAlt) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cardX, currentY, cardWidth, rowH);
        }

        // Borde inferior sutil
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX, currentY + rowH);
        ctx.lineTo(cardX + cardWidth, currentY + rowH);
        ctx.stroke();

        // 1. Día y Fecha
        const dayName = getDayOfWeekName(item.date) || 'Salida';
        const [yStr, mStr, dStr] = item.date.split('-');
        const dateFormatted = dStr && mStr ? `${dStr}/${mStr}/${yStr}` : item.date;

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(dayName, colX.day, currentY + 24);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
        ctx.fillText(`${dateFormatted} · ${item.time} hrs`, colX.day, currentY + 41);

        // 2. Lugar de Salida
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        // Cortar nombre si es muy largo
        const placeName = item.placeName.length > 32 ? `${item.placeName.substring(0, 30)}...` : item.placeName;
        ctx.fillText(placeName, colX.place, currentY + 27);

        // 3. Encargado
        ctx.fillStyle = '#334155';
        ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const leaderName = item.leaderName.length > 26 ? `${item.leaderName.substring(0, 24)}...` : item.leaderName;
        ctx.fillText(leaderName, colX.leader, currentY + 27);

        // 4. Modalidad / Territorio (Pill badge dibujado con colores oficiales)
        const type = item.activityType || 'TERRITORIO';
        let badgeBg = '#f1f5f9';
        let badgeBorder = '#cbd5e1';
        let badgeText = '#334155';
        let badgeLabel = 'Territorio regular';

        if (type === 'RURAL') {
          badgeBg = '#ecfdf5';
          badgeBorder = '#a7f3d0';
          badgeText = '#065f46';
          badgeLabel = item.territoryNumber
            ? `🌲 Territorio Rural #${item.territoryNumber}`
            : '🌲 Predicación Rural';
        } else if (type === 'CALLES') {
          badgeBg = '#fffbeb';
          badgeBorder = '#fde68a';
          badgeText = '#92400e';
          badgeLabel = '🚶 Por las Calles (Sin tarjeta)';
        } else if (type === 'ZOOM') {
          badgeBg = '#f0f9ff';
          badgeBorder = '#bae6fd';
          badgeText = '#0369a1';
          badgeLabel = '💻 Por Zoom (Sin tarjeta)';
        } else if (type === 'CARTAS') {
          badgeBg = '#faf5ff';
          badgeBorder = '#e9d5ff';
          badgeText = '#6b21a8';
          badgeLabel = '✉️ Cartas / Teléfono (Sin tarjeta)';
        } else if (type === 'GIRA') {
          badgeBg = '#f0fdfa';
          badgeBorder = '#99f6e4';
          badgeText = '#0f766e';
          badgeLabel = '🚐 Gira de Predicación (Sin tarjeta)';
        } else {
          badgeBg = '#eff6ff';
          badgeBorder = '#bfdbfe';
          badgeText = '#1e40af';
          badgeLabel = item.territoryNumber
            ? `🏠 Territorio #${item.territoryNumber}`
            : '🏠 Territorio por asignar';
        }

        // Renderizar Pill Badge
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const badgeMetrics = ctx.measureText(badgeLabel);
        const pillW = badgeMetrics.width + 16;
        const pillH = 24;
        const pillX = colX.modality;
        const pillY = currentY + 12;

        ctx.fillStyle = badgeBg;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
        ctx.fill();

        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = badgeText;
        ctx.fillText(badgeLabel, pillX + 8, pillY + 16);

        // Notas adicionales si existen
        if (item.notes) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const noteText = `Nota: ${item.notes.substring(0, 100)}`;
          ctx.fillText(noteText, colX.place, currentY + 58);
        }

        currentY += rowH;
      });
    }

    // Footer de la Tarjeta
    ctx.fillStyle = '#f8fafc';
    drawRoundedRect(ctx, cardX, currentY, cardWidth, footerHeight, {
      tl: 0,
      tr: 0,
      br: 16,
      bl: 16,
    });
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, currentY);
    ctx.lineTo(cardX + cardWidth, currentY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Organización de Predicación Congregacional · Documento oficial de servicio', cardX + 28, currentY + 29);

    // Descargar como archivo PNG
    return new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen del programa semanal.'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanName = congregation.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateTag = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `Programa_Predicacion_${cleanName}_${dateTag}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 100);
      }, 'image/png');
    });
  },
};
