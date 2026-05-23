// Utilitários de exportação PDF / Excel
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportarPDF({ titulo, colunas, linhas, subtitulo }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(titulo, 14, 16);
  if (subtitulo) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitulo, 14, 22);
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: subtitulo ? 28 : 22,
    head: [colunas],
    body: linhas,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.setFontSize(8);
  doc.setTextColor(120);
  const gerado = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
  doc.text(gerado, 14, doc.internal.pageSize.height - 8);
  doc.save(`${slug(titulo)}.pdf`);
}

export function exportarExcel({ titulo, dados, sheetName = 'Dados' }) {
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, `${slug(titulo)}.xlsx`);
}

function slug(t) {
  return t.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
