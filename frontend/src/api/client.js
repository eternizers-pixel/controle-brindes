// src/api/client.js
// Camada de acesso a dados — Supabase JS client.
import { supabase } from '../lib/supabase';

/* ---------- helpers ---------- */
// Sempre await a query (builder ou Promise) e devolve apenas data,
// lançando Error se houver erro.
const handle = async (q) => {
  const { data, error } = await q;
  if (error) throw new Error(error.message || error.details || JSON.stringify(error));
  return data;
};

function enriquecerBrinde(b) {
  return {
    ...b,
    categoria_nome: b.categorias?.nome ?? null,
    categoria_cor:  b.categorias?.cor  ?? null,
    valor_total:    Number(b.quantidade_estoque) * Number(b.custo_unitario),
    nivel_estoque:
      b.quantidade_estoque <= 0 ? 'critico'
      : b.quantidade_estoque <= b.estoque_minimo ? 'baixo' : 'saudavel',
  };
}

/* ===================================================================
   CATEGORIAS
=================================================================== */
export const getCategorias = () =>
  handle(supabase.from('categorias').select('*').order('nome'));

export const criarCategoria = (d) =>
  handle(supabase.from('categorias').insert(d).select().single());

/* ===================================================================
   BRINDES
=================================================================== */
export async function getBrindes({ search = '', status, categoria } = {}) {
  let q = supabase
    .from('brindes')
    .select('*, categorias(nome,cor)')
    .order('nome');
  if (status)    q = q.eq('status', status);
  if (categoria) q = q.eq('categoria_id', categoria);
  if (search) {
    const s = String(search).trim().replace(/[,()*%]/g, '');  // sanitize
    if (s) q = q.or(`nome.ilike.%${s}%,codigo.ilike.%${s}%`);
  }
  const rows = await handle(q);
  return (rows || []).map(enriquecerBrinde);
}

export const getBrinde = async (id) => {
  const row = await handle(
    supabase.from('brindes').select('*, categorias(nome,cor)').eq('id', id).single()
  );
  return enriquecerBrinde(row);
};

export async function criarBrinde(payload) {
  const {
    nome, descricao, foto, categoria_id, codigo,
    quantidade_estoque = 0, estoque_minimo = 5, custo_unitario = 0, status = 'ativo',
  } = payload;

  const novo = await handle(supabase.from('brindes').insert({
    nome: String(nome).trim(),
    descricao: descricao || null,
    foto: foto || null,
    categoria_id: categoria_id || null,
    codigo: (codigo && String(codigo).trim()) || null,
    quantidade_estoque: Number(quantidade_estoque),
    estoque_minimo: Number(estoque_minimo),
    custo_unitario: Number(custo_unitario),
    status,
  }).select().single());

  // Se já tem estoque inicial, registra como movimentação de entrada
  if (Number(quantidade_estoque) > 0) {
    const hoje = new Date().toISOString().slice(0, 10);
    await handle(supabase.from('movimentacoes').insert({
      brinde_id: novo.id, tipo: 'entrada',
      quantidade: Number(quantidade_estoque), data: hoje,
      custo_unitario: Number(custo_unitario),
      custo_total: Number(quantidade_estoque) * Number(custo_unitario),
      observacao: 'Estoque inicial do cadastro',
    }));
  }
  return novo;
}

export async function atualizarBrinde(id, payload) {
  const patch = { ...payload };
  delete patch.quantidade_estoque;  // só via movimentações
  if ('categoria_id' in patch) patch.categoria_id = patch.categoria_id || null;
  if ('codigo' in patch) patch.codigo = (patch.codigo && String(patch.codigo).trim()) || null;
  patch.atualizado_em = new Date().toISOString();
  return await handle(
    supabase.from('brindes').update(patch).eq('id', id).select().single()
  );
}

// Soft delete = inativar
export const inativarBrinde = (id) =>
  handle(supabase.from('brindes').update({ status: 'inativo' }).eq('id', id));

// Hard delete = remove o brinde e TODAS as movimentações (CASCADE no schema)
export const excluirBrinde = (id) =>
  handle(supabase.from('brindes').delete().eq('id', id));

/* ===================================================================
   MOVIMENTAÇÕES
=================================================================== */
export async function getMovimentacoes(params = {}) {
  const {
    tipo, brinde_id, destinatario, tipo_solicitante,
    inicio, fim, limit = 500,
  } = params;

  let q = supabase
    .from('movimentacoes')
    .select('*, brindes(nome, foto)')
    .order('data', { ascending: false })
    .order('id',   { ascending: false })
    .limit(limit);

  if (tipo)             q = q.eq('tipo', tipo);
  if (brinde_id)        q = q.eq('brinde_id', brinde_id);
  if (tipo_solicitante) q = q.eq('tipo_solicitante', tipo_solicitante);
  if (destinatario)     q = q.ilike('destinatario_nome', `%${destinatario}%`);
  if (inicio)           q = q.gte('data', inicio);
  if (fim)              q = q.lte('data', fim);

  const rows = await handle(q);
  return (rows || []).map((m) => ({
    ...m,
    brinde_nome: m.brindes?.nome,
    brinde_foto: m.brindes?.foto,
  }));
}

export async function registrarEntrada(d) {
  return await handle(supabase.rpc('registrar_entrada', {
    p_brinde_id:  d.brinde_id,
    p_quantidade: d.quantidade,
    p_data:       d.data,
    p_observacao: d.observacao || null,
  }));
}

export async function registrarSaida(d) {
  const clean = (v) => (v && String(v).trim()) || null;
  return await handle(supabase.rpc('registrar_saida', {
    p_brinde_id:        d.brinde_id,
    p_quantidade:       d.quantidade,
    p_data:             d.data || new Date().toISOString().slice(0, 10),
    p_destinatario:     clean(d.destinatario_nome),
    p_tipo_solicitante: clean(d.tipo_solicitante),
    p_responsavel:      clean(d.responsavel),
    p_observacao:       clean(d.observacao),
  }));
}

export const removerMovimentacao = (id) =>
  handle(supabase.rpc('estornar_movimentacao', { p_id: id }));

/* ===================================================================
   PATROCÍNIOS
=================================================================== */
export async function getPatrocinios({ search = '', ativo } = {}) {
  let q = supabase.from('patrocinios').select('*').order('nome');
  if (ativo !== undefined) q = q.eq('ativo', ativo);
  if (search) {
    const s = String(search).trim().replace(/[,()*%]/g, '');
    if (s) q = q.ilike('nome', `%${s}%`);
  }
  return (await handle(q)) || [];
}

export async function criarPatrocinio(payload) {
  return await handle(supabase.from('patrocinios').insert({
    nome: String(payload.nome || '').trim(),
    valor: Number(payload.valor || 0),
    recorrencia: payload.recorrencia || 'unica',
    data_inicio: payload.data_inicio,
    data_fim: payload.data_fim || null,
    categoria: payload.categoria || null,
    forma_pagamento: payload.forma_pagamento || null,
    observacao: payload.observacao || null,
    ativo: payload.ativo !== false,
  }).select().single());
}

export async function atualizarPatrocinio(id, payload) {
  const patch = { ...payload, atualizado_em: new Date().toISOString() };
  if ('valor' in patch) patch.valor = Number(patch.valor);
  if ('forma_pagamento' in patch) patch.forma_pagamento = patch.forma_pagamento || null;
  return await handle(supabase.from('patrocinios').update(patch).eq('id', id).select().single());
}

export const excluirPatrocinio = (id) =>
  handle(supabase.from('patrocinios').delete().eq('id', id));

/* ===================================================================
   DESTINATÁRIOS
=================================================================== */
export async function getDestinatarios({ search = '', tipo } = {}) {
  let q = supabase.from('destinatarios').select('*').order('nome');
  if (tipo)   q = q.eq('tipo', tipo);
  if (search) q = q.ilike('nome', `%${search}%`);
  return await handle(q);
}

/* ===================================================================
   DASHBOARD
=================================================================== */
export async function getDashboard() {
  const [brindes, movsRaw] = await Promise.all([
    handle(supabase.from('brindes').select('*').eq('status', 'ativo')),
    handle(supabase.from('movimentacoes').select('*, brindes(nome)')),
  ]);
  const movs = movsRaw || [];
  const lista = brindes || [];

  const totalBrindes = lista.length;
  const totUnidades  = lista.reduce((s, b) => s + (b.quantidade_estoque || 0), 0);
  const valorTotal   = lista.reduce((s, b) => s + (b.quantidade_estoque || 0) * Number(b.custo_unitario || 0), 0);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const saidasMes = movs.filter((m) => m.tipo === 'saida' && m.data >= inicioMes);
  const entreguesMes = saidasMes.reduce((s, m) => s + m.quantidade, 0);
  const custoEntreguesMes = saidasMes.reduce((s, m) => s + Number(m.custo_total || 0), 0);

  // mais entregues
  const totaisPorBrinde = {};
  movs.filter((m) => m.tipo === 'saida').forEach((m) => {
    if (!totaisPorBrinde[m.brinde_id])
      totaisPorBrinde[m.brinde_id] = { id: m.brinde_id, nome: m.brindes?.nome || '?', total: 0 };
    totaisPorBrinde[m.brinde_id].total += m.quantidade;
  });
  const mais_entregues = Object.values(totaisPorBrinde).sort((a, b) => b.total - a.total).slice(0, 5);

  // top destinatários
  const porDest = {};
  movs.filter((m) => m.tipo === 'saida' && m.destinatario_nome).forEach((m) => {
    const k = m.destinatario_nome + '|' + m.tipo_solicitante;
    if (!porDest[k]) porDest[k] = { nome: m.destinatario_nome, tipo: m.tipo_solicitante, total: 0 };
    porDest[k].total += m.quantidade;
  });
  const top_destinatarios = Object.values(porDest).sort((a, b) => b.total - a.total).slice(0, 5);

  // saídas por tipo
  const porTipo = {};
  movs.filter((m) => m.tipo === 'saida' && m.tipo_solicitante).forEach((m) => {
    porTipo[m.tipo_solicitante] = (porTipo[m.tipo_solicitante] || 0) + m.quantidade;
  });
  const saidas_por_tipo = Object.entries(porTipo)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);

  // estoque baixo
  const estoque_baixo = lista
    .filter((b) => b.estoque_minimo > 0 && b.quantidade_estoque <= b.estoque_minimo)
    .sort((a, b) => a.quantidade_estoque - b.quantidade_estoque)
    .slice(0, 10);

  // faixas de custo
  const FAIXAS = [
    { label: 'Até R$ 10',           min: 0,   max: 10 },
    { label: 'R$ 10 — R$ 20',       min: 10,  max: 20 },
    { label: 'R$ 20 — R$ 40',       min: 20,  max: 40 },
    { label: 'R$ 40 — R$ 60',       min: 40,  max: 60 },
    { label: 'R$ 60 — R$ 100',      min: 60,  max: 100 },
    { label: 'Acima de R$ 100',     min: 100, max: Infinity },
  ];
  const faixas_custo = FAIXAS.map((f) => {
    const inFaixa = lista.filter((b) => {
      const c = Number(b.custo_unitario || 0);
      return c >= f.min && c < f.max;
    });
    return {
      label: f.label,
      count: inFaixa.length,
      unidades: inFaixa.reduce((s, b) => s + (b.quantidade_estoque || 0), 0),
      valor_total: inFaixa.reduce((s, b) => s + (b.quantidade_estoque || 0) * Number(b.custo_unitario || 0), 0),
    };
  });

  // últimas saídas
  const ultimas_saidas = movs
    .filter((m) => m.tipo === 'saida')
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
    .slice(0, 8)
    .map((m) => ({ ...m, brinde_nome: m.brindes?.nome }));

  return {
    totais: {
      brindes_cadastrados: totalBrindes,
      unidades_em_estoque: totUnidades,
      valor_total_investido: valorTotal,
      entregues_no_mes: entreguesMes,
      custo_entregues_mes: custoEntreguesMes,
    },
    mais_entregues, top_destinatarios, saidas_por_tipo, estoque_baixo, ultimas_saidas,
    faixas_custo,
  };
}

/* ===================================================================
   RELATÓRIOS
=================================================================== */
export async function relEstoque() {
  const rows = await handle(supabase.from('brindes').select('*, categorias(nome)').order('nome'));
  return (rows || []).map((b) => ({
    id: b.id, nome: b.nome,
    categoria: b.categorias?.nome || null,
    quantidade_estoque: b.quantidade_estoque,
    estoque_minimo: b.estoque_minimo,
    custo_unitario: Number(b.custo_unitario),
    valor_total: b.quantidade_estoque * Number(b.custo_unitario),
    status: b.status,
  }));
}

export async function relSaidas(params = {}) {
  let q = supabase.from('movimentacoes')
    .select('*, brindes(nome)').eq('tipo', 'saida')
    .order('data', { ascending: false }).order('id', { ascending: false });
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  const rows = await handle(q);
  const mapped = (rows || []).map((r) => ({ ...r, brinde: r.brindes?.nome }));
  return {
    rows: mapped,
    total_custo:    mapped.reduce((s, r) => s + Number(r.custo_total || 0), 0),
    total_unidades: mapped.reduce((s, r) => s + r.quantidade, 0),
  };
}

export async function relPorDestinatario(params = {}) {
  let q = supabase.from('movimentacoes').select('*').eq('tipo', 'saida').not('destinatario_nome', 'is', null);
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  if (params.tipo)   q = q.eq('tipo_solicitante', params.tipo);
  const rows = await handle(q);
  const agrup = {};
  (rows || []).forEach((r) => {
    const k = r.destinatario_nome + '|' + r.tipo_solicitante;
    if (!agrup[k]) agrup[k] = {
      destinatario: r.destinatario_nome, tipo: r.tipo_solicitante,
      brindes: new Set(), unidades: 0, custo_total: 0,
    };
    agrup[k].brindes.add(r.brinde_id);
    agrup[k].unidades   += r.quantidade;
    agrup[k].custo_total += Number(r.custo_total);
  });
  return Object.values(agrup)
    .map((r) => ({ ...r, variedade: r.brindes.size, brindes: undefined }))
    .sort((a, b) => b.unidades - a.unidades);
}

export async function relPatrocinios(params = {}) {
  let q = supabase.from('patrocinios').select('*').order('nome');
  if (params.ativo !== undefined) q = q.eq('ativo', params.ativo);
  if (params.inicio)              q = q.gte('data_inicio', params.inicio);
  if (params.fim)                 q = q.lte('data_inicio', params.fim);
  if (params.forma_pagamento)     q = q.eq('forma_pagamento', params.forma_pagamento);
  return (await handle(q)) || [];
}

export async function relCustoEntregas(params = {}) {
  let q = supabase.from('movimentacoes').select('*').eq('tipo', 'saida');
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  const rows = (await handle(q)) || [];
  const total_custo = rows.reduce((s, r) => s + Number(r.custo_total || 0), 0);
  const unidades    = rows.reduce((s, r) => s + r.quantidade, 0);

  const porMes = {};
  rows.forEach((r) => {
    const mes = r.data.slice(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes, unidades: 0, custo: 0 };
    porMes[mes].unidades += r.quantidade;
    porMes[mes].custo += Number(r.custo_total);
  });
  const por_mes = Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes));
  return { custo_total: total_custo, unidades, movimentacoes: rows.length, por_mes };
}
