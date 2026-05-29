// Impressão de etiquetas térmicas 95×10mm tipo "hangtag" (dois tabs imprimíveis
// à esquerda + adesivo à direita).
//
// Estrutura física da etiqueta:
//   ┌──── 29mm ────┬──── 29mm ────┬──── 37mm (adesivo) ────┐
//   │   DESCRIÇÃO  │    CÓDIGO    │       (vazio)          │
//   └──────────────┴──────────────┴────────────────────────┘
//
// Descrição: tab esquerdo (0-29mm), alinhada à esquerda, fonte menor, pode quebrar linha.
// Código: tab do meio (29-58mm), centralizado.
// Adesivo: 58-95mm, sem impressão.
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
  /* Tab esquerdo (descrição) — 0 a 29mm, alinhada à esquerda, deslocada 5mm pra direita */
  .nome {
    position: absolute;
    left: 10mm;
    top: 0;
    width: 17mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    font-size: 7pt;
    font-weight: 700;
    line-height: 1.05;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    overflow: hidden;
  }
  /* Tab do meio (código) — 29 a 58mm, deslocado mais à direita */
  .codigo {
    position: absolute;
    left: 38mm;
    top: 0;
    width: 18mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 9pt;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
  }
  @media screen {
    body { padding: 1rem; background: #f1f5f9; }
    .label { background: white; border: 1px dashed #94a3b8; margin-bottom: 3mm; }
    /* Marcação visual da área adesiva (só na tela, não impresso) — 58 a 95mm */
    .label::before {
      content: '';
      position: absolute;
      left: 58mm;
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
  // Reduz a fonte das descrições muito longas até caber no tab esquerdo (17×10mm).
  // Começa em 7pt e desce em passos de 0.5pt até parar de transbordar ou atingir 4pt.
  function ajustarFonte() {
    document.querySelectorAll('.nome').forEach(function (el) {
      var size = 7;
      el.style.fontSize = size + 'pt';
      var maxIter = 12;
      while (
        maxIter-- > 0 &&
        size > 4 &&
        (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      ) {
        size -= 0.5;
        el.style.fontSize = size + 'pt';
      }
    });
  }
  window.onload = function () {
    ajustarFonte();
    setTimeout(function () { window.print(); }, 250);
  };
</script>
</body>
</html>`);
  w.document.close();
}
