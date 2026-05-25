// Helpers de formatação
export const formatBRL = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatInt = (n) => (Number(n) || 0).toLocaleString('pt-BR');

export const formatDate = (iso) => {
  if (!iso) return '';
  // espera 'YYYY-MM-DD' ou datetime
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
};

export const hoje = () => new Date().toISOString().slice(0, 10);

export const TIPOS_SOLICITANTE = [
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'escola',     label: 'Escola' },
  { value: 'evento',     label: 'Evento' },
  { value: 'associacao', label: 'Associação' },
  { value: 'cliente',    label: 'Cliente' },
  { value: 'outro',      label: 'Outro' },
];

export const labelTipo = (v) =>
  TIPOS_SOLICITANTE.find((t) => t.value === v)?.label || (v || '—');

export const nivelClass = (nivel) => {
  switch (nivel) {
    case 'critico':  return 'badge-red';
    case 'baixo':    return 'badge-yellow';
    case 'saudavel': return 'badge-green';
    default:         return 'badge-gray';
  }
};

export const nivelLabel = (nivel) =>
  ({ critico: 'Crítico', baixo: 'Estoque baixo', saudavel: 'Saudável' }[nivel] || '—');

/* ============================================================
   PATROCÍNIOS
============================================================ */
export const RECORRENCIAS = [
  { value: 'unica',      label: 'Única vez',  intervaloMeses: null },
  { value: 'mensal',     label: 'Mensal',     intervaloMeses: 1 },
  { value: 'bimestral',  label: 'Bimestral',  intervaloMeses: 2 },
  { value: 'trimestral', label: 'Trimestral', intervaloMeses: 3 },
  { value: 'semestral',  label: 'Semestral',  intervaloMeses: 6 },
  { value: 'anual',      label: 'Anual',      intervaloMeses: 12 },
];

export const labelRecorrencia = (v) =>
  RECORRENCIAS.find((r) => r.value === v)?.label || v || '—';

// Formas de pagamento do patrocínio
export const FORMAS_PAGAMENTO = [
  { value: 'dinheiro',        label: 'Dinheiro',         badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'cheque_presente', label: 'Cheque presente',  badge: 'bg-amber-100 text-amber-700' },
  { value: 'produtos_loja',   label: 'Produtos da loja', badge: 'bg-sky-100 text-sky-700' },
  { value: 'outros',          label: 'Outros',           badge: 'bg-slate-100 text-slate-600' },
];

export const labelFormaPagamento = (v) =>
  FORMAS_PAGAMENTO.find((f) => f.value === v)?.label || (v ? v : '—');

export const badgeFormaPagamento = (v) =>
  FORMAS_PAGAMENTO.find((f) => f.value === v)?.badge || 'bg-slate-100 text-slate-600';

// Valor mensal equivalente (quanto custa por mês em média)
export function valorMensalPatrocinio(p) {
  if (!p || !p.recorrencia || p.recorrencia === 'unica') return 0;
  const r = RECORRENCIAS.find((x) => x.value === p.recorrencia);
  if (!r || !r.intervaloMeses) return 0;
  return Number(p.valor || 0) / r.intervaloMeses;
}

// Agrupa patrocínios por forma de pagamento (count + soma do valor mensal e do valor total cadastrado)
export function agruparPorFormaPagamento(patrocinios = []) {
  const out = {};
  FORMAS_PAGAMENTO.forEach((f) => {
    out[f.value] = { value: f.value, label: f.label, count: 0, valor: 0, mensal: 0 };
  });
  out['__sem'] = { value: '__sem', label: 'Não informado', count: 0, valor: 0, mensal: 0 };

  (patrocinios || []).forEach((p) => {
    const key = p.forma_pagamento && out[p.forma_pagamento] ? p.forma_pagamento : '__sem';
    out[key].count += 1;
    out[key].valor += Number(p.valor || 0);
    out[key].mensal += valorMensalPatrocinio(p);
  });

  return Object.values(out).filter((g) => g.count > 0);
}

// Calcula totais (já investido total, ano vigente, mensal recorrente)
export function calcularInvestimentos(patrocinios, hoje = new Date()) {
  let total = 0;       // tudo já desembolsado historicamente
  let totalAno = 0;    // desembolsado neste ano
  let mensal = 0;      // mensal recorrente atual

  const anoAtual = hoje.getFullYear();
  const isodate = (d) => d.toISOString().slice(0, 10);

  (patrocinios || []).forEach((p) => {
    const valor = Number(p.valor || 0);
    if (!valor) return;
    const inicio = new Date(p.data_inicio + 'T00:00:00');
    const limite = p.data_fim ? new Date(p.data_fim + 'T00:00:00') : hoje;
    const efetivoFim = limite < hoje ? limite : hoje;
    if (efetivoFim < inicio) return;

    if (p.recorrencia === 'unica') {
      total += valor;
      if (inicio.getFullYear() === anoAtual) totalAno += valor;
      return;
    }

    const intervalo = RECORRENCIAS.find((r) => r.value === p.recorrencia)?.intervaloMeses;
    if (!intervalo) return;

    // ocorrências até hoje (incluindo a inicial)
    const mesesDiff = (efetivoFim.getFullYear() - inicio.getFullYear()) * 12
                    + (efetivoFim.getMonth() - inicio.getMonth());
    const ocorrencias = Math.max(0, Math.floor(mesesDiff / intervalo) + 1);
    total += ocorrencias * valor;

    // ocorrências no ano vigente
    for (let i = 0; i < ocorrencias; i++) {
      const occ = new Date(inicio);
      occ.setMonth(inicio.getMonth() + i * intervalo);
      if (occ > efetivoFim) break;
      if (occ.getFullYear() === anoAtual) totalAno += valor;
    }

    // mensal recorrente — só se ainda está ativo
    if (p.ativo && (!p.data_fim || new Date(p.data_fim + 'T00:00:00') >= hoje)) {
      mensal += valor / intervalo;
    }
  });

  return { total, totalAno, mensal };
}
