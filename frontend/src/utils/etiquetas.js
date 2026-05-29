// Impressão de etiquetas térmicas 95×10mm tipo "hangtag" (dois tabs imprimíveis
// com adesivo no meio).
//
// Estrutura física da etiqueta:
//   ┌──── 29mm ────┬──── 37mm (adesivo) ────┬──── 29mm ────┐
//   │   DESCRIÇÃO  │       (vazio)          │    CÓDIGO    │
//   └──────────────┴────────────────────────┴──────────────┘
//
// Descrição usa fonte menor e pode quebrar em até 3 linhas.
// Código vai centralizado na ponta direita.
//
// Aceita 1 item (objeto) ou vários (array de objetos):
//   { nome, codigo, quantidade }
// Cada quantidade vira N páginas. O gap de 3mm entre etiquetas no rolo
// é dado pelo próprio espaçamento físico da impressora térmica.

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
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  /* Tab esquerdo (descrição) — 29mm, com 3mm de padding interno */
  .nome {
    position: absolute;
    left: 3mm;
    top: 0;
    width: 26mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 6pt;
    font-weight: 700;
    line-height: 1.05;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    overflow: hidden;
  }
  /* Tab direito (código) — 29mm, com 2.5mm de padding direito */
  .codigo {
    position: absolute;
    right: 2.5mm;
    top: 0;
    width: 26.5mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 8pt;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
  }
  @media screen {
    body { padding: 1rem; background: #f1f5f9; }
    .label { background: white; border: 1px dashed #94a3b8; margin-bottom: 3mm; }
    /* Marcação visual da área adesiva (só na tela, não impresso) */
    .label::before {
      content: '';
      position: absolute;
      left: 29mm;
      top: 0;
      width: 37mm;
      height: 100%;
      background: repeating-linear-gradient(
        45deg, #fde68a, #fde68a 1mm, #fff7cc 1mm, #fff7cc 2mm
      );
      opacity: 0.6;
      pointer-events: none;
    }
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
