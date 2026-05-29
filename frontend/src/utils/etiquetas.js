// Impressão de etiquetas térmicas 95×10mm.
// Aceita 1 item (objeto) ou vários (array de objetos):
//   { nome, codigo, quantidade }
// Cada quantidade vira N páginas com a mesma etiqueta. O espaço de 3mm entre
// etiquetas é dado pelo gap físico do rolo (impressora térmica avança sozinha).

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function imprimirEtiquetas(itens) {
  const lista = Array.isArray(itens) ? itens : [itens];
  const labels = [];
  for (const it of lista) {
    const nome = String(it?.nome || '').trim();
    if (!nome) continue;
    const codigo = String(it?.codigo || '').trim();
    const qtd = Math.max(1, Number(it?.quantidade) || 1);
    const html = `
    <div class="label">
      <span class="nome">${escapeHtml(nome)}</span>
      <span class="codigo">${escapeHtml(codigo)}</span>
    </div>`;
    for (let i = 0; i < qtd; i++) labels.push(html);
  }
  if (labels.length === 0) {
    alert('Nenhuma etiqueta pra imprimir.');
    return;
  }
  const w = window.open('', '_blank', 'width=600,height=400');
  if (!w) {
    alert('Habilite popups deste site para imprimir etiquetas.');
    return;
  }
  const title = lista.length === 1
    ? `Etiquetas — ${escapeHtml(lista[0].nome)}`
    : `Etiquetas — ${labels.length} etiquetas`;
  w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  @page { size: 95mm 10mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; font-family: -apple-system, 'Inter', Arial, sans-serif; }
  .label {
    width: 95mm;
    height: 10mm;
    padding: 0 2.5mm 0 3mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  .nome {
    font-size: 9pt;
    font-weight: 700;
    line-height: 1;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .codigo {
    font-size: 8pt;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  @media screen {
    body { padding: 1rem; background: #f1f5f9; }
    .label { background: white; border: 1px dashed #94a3b8; margin-bottom: 3mm; }
  }
</style>
</head>
<body>
${labels.join('')}
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 200); };
</script>
</body>
</html>`);
  w.document.close();
}
