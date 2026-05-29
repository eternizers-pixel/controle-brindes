// Impressão de etiquetas térmicas 95×10mm tipo "hangtag" (dois tabs imprimíveis
// à esquerda + adesivo à direita).
//
// Estrutura física da etiqueta:
//   ┌──── 29mm ────┬──── 29mm ────┬──── 37mm (adesivo) ────┐
//   │   DESCRIÇÃO  │    CÓDIGO    │       (vazio)          │
//   └──────────────┴──────────────┴────────────────────────┘
//
// Descrição: tab esquerdo, alinhada à esquerda, fonte se auto-ajusta a nomes longos.
// Código: tab do meio, centralizado.
// Adesivo: 58-95mm, sem impressão.
//
// Implementação: usa iframe escondido (sem popup visível) para disparar window.print().
//
// Aceita 1 item (objeto) ou vários (array de objetos):
//   { nome, codigo, quantidade }

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function gerarHtmlEtiquetas(itens) {
  const lista = Array.isArray(itens) ? itens : [itens];
  const labels = [];
  for (const it of lista) {
    const nome = String(it?.nome || '').trim();
    if (!nome) continue;
    const codigo = String(it?.codigo || '').trim();
    const qtd = Math.max(1, Number(it?.quantidade) || 1);
    const html = `<div class="label"><span class="nome">${escapeHtml(nome)}</span><span class="codigo">${escapeHtml(codigo)}</span></div>`;
    for (let i = 0; i < qtd; i++) labels.push(html);
  }
  if (labels.length === 0) return null;
  const total = labels.length;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Etiquetas (${total})</title>
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
  /* Descrição: margem esquerda segura de 8mm + fonte menor pra caber mais por linha */
  .nome {
    position: absolute;
    left: 8mm;
    top: 0;
    width: 20mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    font-size: 5pt;
    font-weight: 700;
    line-height: 1.05;
    word-wrap: break-word;
    overflow-wrap: break-word;
    overflow: hidden;
  }
  /* Código: caixa larga o suficiente pra 10pt sem cortar bordas */
  .codigo {
    position: absolute;
    left: 38mm;
    top: 0;
    width: 20mm;
    height: 10mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 10pt;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
  }
</style>
</head>
<body>${labels.join('')}</body>
</html>`;
}

function ajustarFonteNoIframe(doc) {
  doc.querySelectorAll('.nome').forEach(function (el) {
    let size = 5;
    el.style.fontSize = size + 'pt';
    let maxIter = 12;
    while (
      maxIter-- > 0 &&
      size > 3 &&
      (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
    ) {
      size -= 0.25;
      el.style.fontSize = size + 'pt';
    }
  });
}

export function imprimirEtiquetas(itens) {
  const html = gerarHtmlEtiquetas(itens);
  if (!html) {
    alert('Nenhuma etiqueta pra imprimir.');
    return;
  }

  // Cria iframe escondido (não abre popup visível pro usuário)
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden; pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const disparar = () => {
    try {
      ajustarFonteNoIframe(doc);
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Erro ao imprimir etiquetas:', e);
    } finally {
      // Remove o iframe depois — dá um tempo razoável pro print dialog abrir
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 3000);
    }
  };

  // O iframe pode estar pronto na hora ou precisar do onload
  if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
    setTimeout(disparar, 100);
  } else {
    iframe.onload = () => setTimeout(disparar, 100);
  }
}
