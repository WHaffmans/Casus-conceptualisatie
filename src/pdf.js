import { jsPDF } from 'jspdf';
import { GEZIN_FIELDS, COPING_FIELDS } from './store.js';

// Kleuren uit het originele formulier.
const COLORS = {
  gezin: '#00ffff',
  schema: '#1dcb9a',
  coping: '#ccff99',
  probleem: '#ffff66',
  line: '#000000',
  muted: '#666666',
};

const PAGE = { w: 297, h: 210, margin: 15 };
const PT_TO_MM = 25.4 / 72;
const LINE_HEIGHT = 1.15;
const SCHEMAS_PER_PAGE = 3;

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function lineHeightMm(size) {
  return size * PT_TO_MM * LINE_HEIGHT;
}

// Zet tekst zo groot mogelijk binnen een kader; bij te weinig ruimte wordt afgekapt met "…".
function fitText(doc, text, box, { max = 10, min = 5 } = {}) {
  const content = (text || '').trim();
  if (!content || box.w <= 0 || box.h <= 0) return;
  doc.setFont('helvetica', 'normal');

  let size = max;
  let lines;
  for (; size >= min; size -= 0.5) {
    doc.setFontSize(size);
    lines = doc.splitTextToSize(content, box.w);
    if (lines.length * lineHeightMm(size) <= box.h) break;
  }
  if (size < min) {
    size = min;
    doc.setFontSize(size);
    lines = doc.splitTextToSize(content, box.w);
    const fit = Math.max(1, Math.floor(box.h / lineHeightMm(size)));
    lines = lines.slice(0, fit);
    let last = lines[fit - 1].replace(/\s+$/, '');
    while (last && doc.getTextWidth(`${last}…`) > box.w) last = last.slice(0, -1);
    lines[fit - 1] = `${last}…`;
  }
  doc.setTextColor(0);
  doc.text(lines, box.x, box.y, { baseline: 'top', lineHeightFactor: LINE_HEIGHT });
}

function label(doc, text, x, y, { size = 8 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(0);
  doc.text(text, x, y, { baseline: 'top' });
}

// Leest van boven naar beneden, zoals op het formulier; (right, top) is de rechterbovenhoek.
function verticalLabel(doc, text, right, top, size = 7) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(0);
  // Bij rotatie negeert jsPDF baseline 'top', dus ankeren op de basislijn.
  doc.text(text, right - size * PT_TO_MM * 0.75, top, { angle: -90 });
}

function filledRect(doc, x, y, w, h, color) {
  doc.setFillColor(color);
  doc.setDrawColor(COLORS.line);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'FD');
}

function drawHeader(doc, state) {
  const y = PAGE.margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0);
  const title = "Casusconceptualisatie schema's; naam:";
  doc.text(title, PAGE.margin, y, { baseline: 'top' });
  const nameX = PAGE.margin + doc.getTextWidth(title) + 3;

  const gebX = 200;
  doc.text('geb.', gebX, y, { baseline: 'top' });
  const dateX = gebX + doc.getTextWidth('geb.') + 3;

  doc.setFont('helvetica', 'normal');
  const name = doc.splitTextToSize(state.naam.trim(), gebX - nameX - 4)[0] || '';
  doc.text(name, nameX, y, { baseline: 'top' });
  doc.text(formatDate(state.geboortedatum), dateX, y, { baseline: 'top' });
}

function drawFooter(doc, page, pages) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted);
  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Gemaakt op ${today}`, PAGE.margin, PAGE.h - 8);
  if (pages > 1) {
    doc.text(`Pagina ${page} van ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 8, { align: 'right' });
  }
}

function drawGezin(doc, state, top, height) {
  const gap = 12;
  const width = (PAGE.w - 2 * PAGE.margin - 3 * gap) / 4;
  GEZIN_FIELDS.forEach(({ key, label: text }, i) => {
    const x = PAGE.margin + i * (width + gap);
    filledRect(doc, x, top, width, height, COLORS.gezin);
    label(doc, `${text}:`, x + 2, top + 1.8);
    fitText(doc, state[key], { x: x + 2, y: top + 6, w: width - 4, h: height - 7.5 }, { max: 9 });
  });
}

// Tekent maximaal drie schema-kolommen tussen top en bottom.
function drawSchemas(doc, schemas, top, bottom) {
  const gap = 10;
  const colW = (PAGE.w - 2 * PAGE.margin - 2 * gap) / SCHEMAS_PER_PAGE;

  // Verhoudingen van de rijen zoals op het originele formulier.
  const parts = { ellipse: 30, gap1: 6, coping: 46, gap2: 6, probleem: 36 };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const k = (bottom - top) / total;
  const ellipseH = parts.ellipse * k;
  const copingTop = top + (parts.ellipse + parts.gap1) * k;
  const copingH = parts.coping * k;
  const probleemTop = copingTop + copingH + parts.gap2 * k;
  const probleemH = parts.probleem * k;

  schemas.forEach((schema, i) => {
    const x = PAGE.margin + i * (colW + gap);

    // Schema-ovaal; tekst in de ingeschreven rechthoek.
    const rx = colW / 2;
    const ry = ellipseH / 2;
    const cx = x + rx;
    const cy = top + ry;
    doc.setFillColor(COLORS.schema);
    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(0.3);
    doc.ellipse(cx, cy, rx, ry, 'FD');
    const innerW = rx * 2 * 0.7;
    const innerH = ry * 2 * 0.7;
    const innerX = cx - innerW / 2;
    const innerY = cy - innerH / 2;
    label(doc, 'Schema:', innerX, innerY);
    fitText(doc, schema.naam, { x: innerX, y: innerY + 4, w: innerW, h: innerH - 4 }, { max: 9, min: 5 });

    // Overgave / Vermijding / Overcompensatie met gedraaid label aan de rechterkant.
    const copingGap = 4;
    const copingW = (colW - 2 * copingGap) / 3;
    COPING_FIELDS.forEach(({ key, label: text }, j) => {
      const bx = x + j * (copingW + copingGap);
      filledRect(doc, bx, copingTop, copingW, copingH, COLORS.coping);
      verticalLabel(doc, text, bx + copingW - 1.2, copingTop + 2);
      fitText(doc, schema[key], { x: bx + 1.5, y: copingTop + 1.8, w: copingW - 6, h: copingH - 3.3 }, { max: 8, min: 4.5 });
    });

    // Probleem.
    filledRect(doc, x, probleemTop, colW, probleemH, COLORS.probleem);
    label(doc, 'probleem', x + 2, probleemTop + 1.8);
    fitText(doc, schema.probleem, { x: x + 2, y: probleemTop + 6, w: colW - 4, h: probleemH - 7.5 }, { max: 9 });
  });
}

export function buildPdf(state) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Casusconceptualisatie schema's ${state.naam}`.trim(), creator: 'Casusconceptualisatie app' });

  const groups = [];
  for (let i = 0; i < state.schemas.length; i += SCHEMAS_PER_PAGE) {
    groups.push(state.schemas.slice(i, i + SCHEMAS_PER_PAGE));
  }
  if (groups.length === 0) groups.push([]);

  const contentBottom = PAGE.h - 14;
  groups.forEach((group, index) => {
    if (index > 0) doc.addPage();
    drawHeader(doc, state);
    if (index === 0) {
      drawGezin(doc, state, 27, 34);
      drawSchemas(doc, group, 68, contentBottom);
    } else {
      drawSchemas(doc, group, 28, contentBottom);
    }
    drawFooter(doc, index + 1, groups.length);
  });

  return doc;
}

export function pdfFileName(state) {
  const name = state.naam.trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return ['Casusconceptualisatie', name, date].filter(Boolean).join('_') + '.pdf';
}
