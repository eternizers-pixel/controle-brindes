// src/api/client.js
// Camada de acesso a dados — Supabase JS client.
import { supabase } from '../lib/supabase';
import { FAIXAS_CUSTO } from '../utils/helpers';

/* ===================================================================
   XBZ (busca de produtos via serverless function)
=================================================================== */
export async function buscarNoXBZ(busca) {
  const term = String(busca || '').trim();
  if (!term) return [];
  const r = await fetch(`/api/xbz-search?busca=${encodeURIComponent(term)}`);
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`Falha ao buscar no XBZ (${r.status}). ${txt}`);
  }
  const data = await r.json();
  return data.produtos || [];
}

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
    .select('*, categorias(nome,cor), niveis_brinde(id,nome,cor)')
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
    supabase.from('brindes').select('*, categorias(nome,cor), niveis_brinde(id,nome,cor)').eq('id', id).single()
  );
  return enriquecerBrinde(row);
};

export async function criarBrinde(payload) {
  const {
    nome, descricao, foto, categoria_id, codigo, nivel_id,
    quantidade_estoque = 0, estoque_minimo = 5, custo_unitario = 0, status = 'ativo',
    parametros_gravacao = [], valor_percebido,
  } = payload;

  const novo = await handle(supabase.from('brindes').insert({
    nome: String(nome).trim(),
    descricao: descricao || null,
    foto: foto || null,
    categoria_id: categoria_id || null,
    nivel_id: nivel_id || null,
    codigo: (codigo && String(codigo).trim()) || null,
    quantidade_estoque: Number(quantidade_estoque),
    estoque_minimo: Number(estoque_minimo),
    custo_unitario: Number(custo_unitario),
    valor_percebido: valor_percebido == null || valor_percebido === '' ? null : Number(valor_percebido),
    status,
    parametros_gravacao: Array.isArray(parametros_gravacao) ? parametros_gravacao : [],
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
  if ('nivel_id' in patch) patch.nivel_id = patch.nivel_id || null;
  if ('codigo' in patch) patch.codigo = (patch.codigo && String(patch.codigo).trim()) || null;
  if ('valor_percebido' in patch) {
    patch.valor_percebido = patch.valor_percebido == null || patch.valor_percebido === '' ? null : Number(patch.valor_percebido);
  }
  if ('parametros_gravacao' in patch) {
    patch.parametros_gravacao = Array.isArray(patch.parametros_gravacao) ? patch.parametros_gravacao : [];
  }
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
    .select('*, brindes(nome, foto, codigo)')
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
    brinde_codigo: m.brindes?.codigo,
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

// Atualiza campos editáveis de uma movimentação (sem mexer em estoque).
// Permite corrigir data, destinatário, tipo_solicitante e observação.
export async function atualizarMovimentacao(id, payload) {
  const clean = (v) => (v && String(v).trim()) || null;
  const patch = {};
  if ('data' in payload)               patch.data = payload.data;
  if ('destinatario_nome' in payload)  patch.destinatario_nome = clean(payload.destinatario_nome);
  if ('tipo_solicitante' in payload)   patch.tipo_solicitante = clean(payload.tipo_solicitante);
  if ('observacao' in payload)         patch.observacao = clean(payload.observacao);
  return await handle(supabase.from('movimentacoes').update(patch).eq('id', id).select().single());
}

/* ===================================================================
   NÍVEIS DE BRINDE (categorias por faixa de valor de orçamento)
=================================================================== */
export async function getNiveis() {
  return (await handle(
    supabase.from('niveis_brinde').select('*').order('ordem', { ascending: true })
  )) || [];
}

export async function criarNivel(payload) {
  return await handle(supabase.from('niveis_brinde').insert({
    nome: String(payload.nome || '').trim(),
    ordem: Number(payload.ordem) || 0,
    valor_min: payload.valor_min == null || payload.valor_min === '' ? null : Number(payload.valor_min),
    valor_max: payload.valor_max == null || payload.valor_max === '' ? null : Number(payload.valor_max),
    niveis_inclusos: Array.isArray(payload.niveis_inclusos) ? payload.niveis_inclusos.map(Number) : [],
    cor: payload.cor || null,
    ativo: payload.ativo !== false,
  }).select().single());
}

export async function atualizarNivel(id, payload) {
  const patch = { atualizado_em: new Date().toISOString() };
  if ('nome'             in payload) patch.nome = String(payload.nome || '').trim();
  if ('ordem'            in payload) patch.ordem = Number(payload.ordem) || 0;
  if ('valor_min'        in payload) patch.valor_min = payload.valor_min == null || payload.valor_min === '' ? null : Number(payload.valor_min);
  if ('valor_max'        in payload) patch.valor_max = payload.valor_max == null || payload.valor_max === '' ? null : Number(payload.valor_max);
  if ('niveis_inclusos'  in payload) patch.niveis_inclusos = Array.isArray(payload.niveis_inclusos) ? payload.niveis_inclusos.map(Number) : [];
  if ('cor'              in payload) patch.cor = payload.cor || null;
  if ('ativo'            in payload) patch.ativo = !!payload.ativo;
  return await handle(supabase.from('niveis_brinde').update(patch).eq('id', id).select().single());
}

export const excluirNivel = (id) =>
  handle(supabase.from('niveis_brinde').delete().eq('id', id));

// Helper que o sistema de orçamento pode chamar (chama a RPC do banco).
// supabase.rpc('brindes_por_orcamento', { p_valor: 1500 }) — devolve lista de brindes liberados.
export async function brindesPorOrcamento(valor) {
  return (await handle(supabase.rpc('brindes_por_orcamento', { p_valor: Number(valor) || 0 }))) || [];
}

/* ===================================================================
   PRODUTOS DE GRAVAÇÃO (itens que não são brindes — só pra parâmetros)
=================================================================== */
export async function getProdutosGravacao({ search = '' } = {}) {
  let q = supabase.from('produtos_gravacao').select('*').order('nome');
  if (search) {
    const s = String(search).trim().replace(/[,()*%]/g, '');
    if (s) q = q.or(`nome.ilike.%${s}%,codigo.ilike.%${s}%`);
  }
  return (await handle(q)) || [];
}

export async function criarProdutoGravacao(payload) {
  return await handle(supabase.from('produtos_gravacao').insert({
    nome: String(payload.nome || '').trim(),
    codigo: (payload.codigo && String(payload.codigo).trim()) || null,
    descricao: payload.descricao || null,
    foto: payload.foto || null,
    parametros_gravacao: Array.isArray(payload.parametros_gravacao) ? payload.parametros_gravacao : [],
  }).select().single());
}

export async function atualizarProdutoGravacao(id, payload) {
  const patch = { ...payload, atualizado_em: new Date().toISOString() };
  if ('codigo' in patch) patch.codigo = (patch.codigo && String(patch.codigo).trim()) || null;
  if ('parametros_gravacao' in patch) {
    patch.parametros_gravacao = Array.isArray(patch.parametros_gravacao) ? patch.parametros_gravacao : [];
  }
  return await handle(supabase.from('produtos_gravacao').update(patch).eq('id', id).select().single());
}

export const excluirProdutoGravacao = (id) =>
  handle(supabase.from('produtos_gravacao').delete().eq('id', id));

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
    handle(supabase.from('movimentacoes').select('*, brindes(nome, foto, codigo)')),
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
    .filter((b) => (b.quantidade_estoque || 0) <= 0 || (b.estoque_minimo > 0 && b.quantidade_estoque <= b.estoque_minimo))
    .sort((a, b) => a.quantidade_estoque - b.quantidade_estoque)
    .slice(0, 15);

  // faixas de custo (definidas em utils/helpers.js)
  const faixas_custo = FAIXAS_CUSTO.map((f) => {
    const inFaixa = lista.filter((b) => {
      const c = Number(b.custo_unitario || 0);
      return c >= f.min && c < f.max;
    });
    return {
      key: f.key,
      label: f.label,
      badge: f.badge,
      barColor: f.barColor,
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
    .map((m) => ({
      ...m,
      brinde_nome: m.brindes?.nome,
      brinde_foto: m.brindes?.foto,
      brinde_codigo: m.brindes?.codigo,
    }));

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
    .select('*, brindes!inner(nome, nivel_id)').eq('tipo', 'saida')
    .order('data', { ascending: false }).order('id', { ascending: false });
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  if (params.nivel)  q = q.eq('brindes.nivel_id', params.nivel);
  const rows = await handle(q);
  const mapped = (rows || []).map((r) => ({ ...r, brinde: r.brindes?.nome }));
  return {
    rows: mapped,
    total_custo:    mapped.reduce((s, r) => s + Number(r.custo_total || 0), 0),
    total_unidades: mapped.reduce((s, r) => s + r.quantidade, 0),
  };
}

export async function relPorDestinatario(params = {}) {
  let q = supabase.from('movimentacoes').select('*, brindes!inner(nivel_id)').eq('tipo', 'saida').not('destinatario_nome', 'is', null);
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  if (params.tipo)   q = q.eq('tipo_solicitante', params.tipo);
  if (params.nivel)  q = q.eq('brindes.nivel_id', params.nivel);
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
  let q = supabase.from('movimentacoes').select('*, brindes!inner(nivel_id)').eq('tipo', 'saida');
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  if (params.nivel)  q = q.eq('brindes.nivel_id', params.nivel);
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


export async function getReservasAtivas() {
  const { data, error } = await supabase
    .from('reservas_brinde')
    .select('id, brinde_id, orcamento_id, orcamento_info, status, expira_em, criada_em')
    .in('status', ['reservado', 'pensando'])
    .gt('expira_em', new Date().toISOString())
    .order('criada_em', { ascending: false });
  if (error) { console.error('getReservasAtivas err', error); return []; }
  return data || [];
}

export async function cancelarReservaManual(reservaId) {
  const { error } = await supabase
    .from('reservas_brinde')
    .update({ status: 'cancelada', cancelada_em: new Date().toISOString() })
    .eq('id', reservaId)
    .in('status', ['reservado', 'pensando']);
  if (error) { console.error('cancelarReservaManual err', error); throw error; }
  return true;
}


/* ============================================================================
 * RELATÓRIOS — Brindes via orçamento, conversão, top entregues, por nível
 * ========================================================================= */

// Lista detalhada de brindes via orçamento (reservas com info de cliente/orçamento)
export async function relBrindesViaOrcamento(params = {}) {
  let q = supabase.from('reservas_brinde')
    .select('*, brindes!inner(id, nome, custo_unitario, valor_percebido, nivel_id, niveis_brinde(id, nome, cor))')
    .order('criada_em', { ascending: false });
  if (params.inicio) q = q.gte('criada_em', params.inicio + 'T00:00:00');
  if (params.fim)    q = q.lte('criada_em', params.fim + 'T23:59:59.999');
  if (params.nivel)  q = q.eq('brindes.nivel_id', params.nivel);
  const rows = await handle(q);

  const statusGrupo = (s) => {
    if (s === 'confirmado') return 'entregue';
    if (s === 'cancelada' || s === 'expirada') return 'nao_entregue';
    return 'aguardando'; // reservado, pensando
  };

  return (rows || []).map((r) => {
    // orcamento_info pode ser objeto JSON {customerName, customerPhone, totalValue}
    // ou string. Extrair nome do cliente com fallbacks.
    let cliente = '—';
    let valorOrc = null;
    const info = r.orcamento_info;
    if (info && typeof info === 'object') {
      cliente = info.customerName || info.customer_name || info.cliente || '—';
      valorOrc = info.totalValue || info.total_value || info.valor || null;
    } else if (typeof info === 'string' && info.trim()) {
      cliente = info;
    }
    return ({
    id: r.id,
    cliente,
    valor_orcamento: valorOrc,
    orcamento_id: r.orcamento_id,
    brinde_nome: r.brindes?.nome || '—',
    nivel_nome: r.brindes?.niveis_brinde?.nome || null,
    custo: Number(r.brindes?.custo_unitario || 0),
    vpp: Number(r.brindes?.valor_percebido || 0),
    status: r.status,
    grupo: statusGrupo(r.status),
    criada_em: r.criada_em,
    expira_em: r.expira_em,
    confirmada_em: r.confirmada_em || null,
    cancelada_em: r.cancelada_em || null,
    });
  });
}

// Taxa de conversão dos brindes via orçamento
export async function relConversaoBrinde(params = {}) {
  const rows = await relBrindesViaOrcamento(params);
  const total = rows.length;
  const entregues     = rows.filter((r) => r.grupo === 'entregue').length;
  const naoEntregues  = rows.filter((r) => r.grupo === 'nao_entregue').length;
  const aguardando    = rows.filter((r) => r.grupo === 'aguardando').length;
  const fechados = entregues + naoEntregues;
  const taxa = fechados > 0 ? (entregues / fechados) : 0;
  const custoEntregue = rows.filter((r) => r.grupo === 'entregue').reduce((s, r) => s + r.custo, 0);
  const vppEntregue   = rows.filter((r) => r.grupo === 'entregue').reduce((s, r) => s + r.vpp, 0);
  return { total, entregues, naoEntregues, aguardando, taxa, custoEntregue, vppEntregue };
}

// Saídas agrupadas por nível
export async function relPorNivel(params = {}) {
  let q = supabase.from('movimentacoes')
    .select('*, brindes(id, nome, nivel_id, niveis_brinde(id, nome, cor, ordem))')
    .eq('tipo', 'saida');
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  const rows = (await handle(q)) || [];
  const agrup = {};
  rows.forEach((r) => {
    const nivel = r.brindes?.niveis_brinde;
    const key = nivel?.id || 'sem';
    if (!agrup[key]) agrup[key] = {
      nivel_id:   nivel?.id || null,
      nivel_nome: nivel?.nome || 'Sem nível',
      nivel_cor:  nivel?.cor  || null,
      ordem:      nivel?.ordem || 999,
      unidades: 0,
      custo_total: 0,
      variedade: new Set(),
    };
    agrup[key].unidades    += r.quantidade;
    agrup[key].custo_total += Number(r.custo_total);
    agrup[key].variedade.add(r.brinde_id);
  });
  return Object.values(agrup)
    .map((g) => ({ ...g, variedade: g.variedade.size }))
    .sort((a, b) => a.ordem - b.ordem);
}

// Top brindes mais entregues (ranking)
export async function relTopBrindes(params = {}) {
  let q = supabase.from('movimentacoes')
    .select('*, brindes!inner(id, nome, custo_unitario, valor_percebido, nivel_id, niveis_brinde(nome))')
    .eq('tipo', 'saida');
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  if (params.nivel)  q = q.eq('brindes.nivel_id', params.nivel);
  const rows = (await handle(q)) || [];
  const agrup = {};
  rows.forEach((r) => {
    const id = r.brinde_id;
    if (!agrup[id]) agrup[id] = {
      brinde_id: id,
      brinde_nome: r.brindes?.nome || '—',
      nivel_nome: r.brindes?.niveis_brinde?.nome || null,
      vpp_unit: Number(r.brindes?.valor_percebido || 0),
      unidades: 0,
      custo_total: 0,
      vpp_total: 0,
    };
    agrup[id].unidades    += r.quantidade;
    agrup[id].custo_total += Number(r.custo_total);
    agrup[id].vpp_total   += Number(r.brindes?.valor_percebido || 0) * r.quantidade;
  });
  return Object.values(agrup).sort((a, b) => b.unidades - a.unidades);
}


/* ============================================================================
 * PASSO A PASSO DE GRAVAÇÃO (aba Parâmetros)
 * ========================================================================= */

// Lista todos os passos, ordenados por secao e ordem
export async function getGravacaoPassos() {
  const rows = await handle(
    supabase.from('gravacao_passos')
      .select('*')
      .order('secao')
      .order('tipo_produto', { nullsFirst: true })
      .order('ordem')
  );
  return rows || [];
}

// Cria um novo passo
export async function criarGravacaoPasso(payload) {
  const row = await handle(
    supabase.from('gravacao_passos').insert({
      secao:        payload.secao || 'setup',
      tipo_produto: payload.tipo_produto || null,
      ordem:        Number(payload.ordem || 0),
      titulo:       payload.titulo || 'Novo passo',
      descricao:    payload.descricao || '',
      fotos:        Array.isArray(payload.fotos) ? payload.fotos : [],
    }).select().single()
  );
  return row;
}

// Atualiza um passo existente
export async function atualizarGravacaoPasso(id, payload) {
  const patch = { updated_at: new Date().toISOString() };
  if (payload.secao !== undefined)        patch.secao        = payload.secao;
  if (payload.tipo_produto !== undefined) patch.tipo_produto = payload.tipo_produto;
  if (payload.ordem !== undefined)        patch.ordem        = Number(payload.ordem);
  if (payload.titulo !== undefined)       patch.titulo       = payload.titulo;
  if (payload.descricao !== undefined)    patch.descricao    = payload.descricao;
  if (payload.fotos !== undefined)        patch.fotos        = Array.isArray(payload.fotos) ? payload.fotos : [];
  const row = await handle(
    supabase.from('gravacao_passos').update(patch).eq('id', id).select().single()
  );
  return row;
}

// Deleta um passo
export async function deletarGravacaoPasso(id) {
  await handle(supabase.from('gravacao_passos').delete().eq('id', id));
  return true;
}
