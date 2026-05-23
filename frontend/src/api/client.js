// src/api/client.js
// Camada de acesso a dados — Supabase JS client.
// Mantém a mesma assinatura usada pelas páginas (getBrindes, criarBrinde, etc.)
import { supabase } from '../lib/supabase';

/* ---------- helpers ---------- */
const handle = ({ data, error }) => {
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
  if (search)    q = q.ilike('nome', `%${search}%`);
  const rows = handle(await q);
  return rows.map(enriquecerBrinde);
}

export const getBrinde = async (id) => {
  const row = handle(
    await supabase.from('brindes').select('*, categorias(nome,cor)').eq('id', id).single()
  );
  return enriquecerBrinde(row);
};

export async function criarBrinde(payload) {
  const {
    nome, descricao, foto, categoria_id,
    quantidade_estoque = 0, estoque_minimo = 5, custo_unitario = 0, status = 'ativo',
  } = payload;

  const novo = handle(await supabase.from('brindes').insert({
    nome: String(nome).trim(),
    descricao: descricao || null,
    foto: foto || null,
    categoria_id: categoria_id || null,
    quantidade_estoque: Number(quantidade_estoque),
    estoque_minimo: Number(estoque_minimo),
    custo_unitario: Number(custo_unitario),
    status,
  }).select().single());

  // Se já tem estoque inicial, registra como movimentação de entrada
  if (Number(quantidade_estoque) > 0) {
    const hoje = new Date().toISOString().slice(0, 10);
    handle(await supabase.from('movimentacoes').insert({
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
  // Não permite alterar quantidade_estoque direto — só via movimentações
  const patch = { ...payload };
  delete patch.quantidade_estoque;
  if ('categoria_id' in patch) patch.categoria_id = patch.categoria_id || null;
  patch.atualizado_em = new Date().toISOString();
  return handle(await supabase.from('brindes').update(patch).eq('id', id).select().single());
}

// Soft delete = inativar
export const inativarBrinde = (id) =>
  handle(supabase.from('brindes').update({ status: 'inativo' }).eq('id', id));

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

  const rows = handle(await q);
  return rows.map((m) => ({
    ...m,
    brinde_nome: m.brindes?.nome,
    brinde_foto: m.brindes?.foto,
  }));
}

// Usa a RPC do Supabase para garantir atomicidade
export async function registrarEntrada(d) {
  return handle(await supabase.rpc('registrar_entrada', {
    p_brinde_id:  d.brinde_id,
    p_quantidade: d.quantidade,
    p_data:       d.data,
    p_observacao: d.observacao || null,
  }));
}

export async function registrarSaida(d) {
  return handle(await supabase.rpc('registrar_saida', {
    p_brinde_id:        d.brinde_id,
    p_quantidade:       d.quantidade,
    p_data:             d.data,
    p_destinatario:     d.destinatario_nome,
    p_tipo_solicitante: d.tipo_solicitante,
    p_responsavel:      d.responsavel,
    p_observacao:       d.observacao || null,
  }));
}

export const removerMovimentacao = (id) =>
  handle(supabase.rpc('estornar_movimentacao', { p_id: id }));

/* ===================================================================
   DESTINATÁRIOS
=================================================================== */
export async function getDestinatarios({ search = '', tipo } = {}) {
  let q = supabase.from('destinatarios').select('*').order('nome');
  if (tipo)   q = q.eq('tipo', tipo);
  if (search) q = q.ilike('nome', `%${search}%`);
  return handle(await q);
}

/* ===================================================================
   DASHBOARD
=================================================================== */
export async function getDashboard() {
  const [brindesRes, movsRes] = await Promise.all([
    supabase.from('brindes').select('*').eq('status', 'ativo'),
    supabase.from('movimentacoes').select('*, brindes(nome)'),
  ]);
  const brindes = handle(brindesRes);
  const movs    = handle(movsRes);

  const totalBrindes = brindes.length;
  const totUnidades  = brindes.reduce((s, b) => s + b.quantidade_estoque, 0);
  const valorTotal   = brindes.reduce((s, b) => s + b.quantidade_estoque * Number(b.custo_unitario), 0);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const saidasMes = movs.filter((m) => m.tipo === 'saida' && m.data >= inicioMes);
  const entreguesMes = saidasMes.reduce((s, m) => s + m.quantidade, 0);
  const custoEntreguesMes = saidasMes.reduce((s, m) => s + Number(m.custo_total), 0);

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
  const estoque_baixo = brindes
    .filter((b) => b.quantidade_estoque <= b.estoque_minimo)
    .sort((a, b) => a.quantidade_estoque - b.quantidade_estoque)
    .slice(0, 10);

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
  };
}

/* ===================================================================
   RELATÓRIOS
=================================================================== */
export async function relEstoque() {
  const rows = handle(await supabase.from('brindes')
    .select('*, categorias(nome)').order('nome'));
  return rows.map((b) => ({
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
  const rows = handle(await q);
  const mapped = rows.map((r) => ({ ...r, brinde: r.brindes?.nome }));
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
  const rows = handle(await q);
  const agrup = {};
  rows.forEach((r) => {
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

export async function relCustoEntregas(params = {}) {
  let q = supabase.from('movimentacoes').select('*').eq('tipo', 'saida');
  if (params.inicio) q = q.gte('data', params.inicio);
  if (params.fim)    q = q.lte('data', params.fim);
  const rows = handle(await q);
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
