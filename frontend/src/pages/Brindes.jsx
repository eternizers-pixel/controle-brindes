import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Package2, X, Printer, Check, Award } from 'lucide-react';
import { getBrindes, getNiveis } from '../api/client';
import { formatBRL, formatInt, FAIXAS_CUSTO, getFaixaCusto, getFaixaByKey } from '../utils/helpers';
import BrindeFormModal from '../components/BrindeFormModal';
import EtiquetasMassaModal from '../components/EtiquetasMassaModal';
import { badgeCor } from './NiveisBrinde';

const ORDENACOES = [
  { value: 'az',           label: 'Nome (A-Z)' },
  { value: 'za',           label: 'Nome (Z-A)' },
  { value: 'recentes',     label: 'Últimos cadastrados' },
  { value: 'preco_asc',    label: 'Menor preço' },
  { value: 'preco_desc',   label: 'Maior preço' },
  { value: 'estoque_desc', label: 'Maior estoque' },
  { value: 'estoque_asc',  label: 'Menor estoque' },
];

// Função pra ordenar do mais recente pro mais antigo (usa criado_em se tiver, senão id)
function timestampDe(b) {
  if (b.criado_em) return new Date(b.criado_em).getTime();
  return Number(b.id || 0);
}

export default function Brindes() {
  const [brindes, setBrindes] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [editFor, setEditFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [etiquetasOpen, setEtiquetasOpen] = useState(false);
  const [ordem, setOrdem] = useState('az');
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [searchParams, setSearchParams] = useSearchParams();

  const toggleSelecionado = (id) => {
    setSelecionados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };
  const limparSelecao = () => setSelecionados(new Set());

  const faixaKey = searchParams.get('faixa') || '';
  const faixaSelecionada = faixaKey ? getFaixaByKey(faixaKey) : null;
  const nivelFiltro = searchParams.get('nivel') || ''; // 'sem' = sem categoria; id = nível específico
  const nivelSelecionado = nivelFiltro && nivelFiltro !== 'sem'
    ? niveis.find((n) => String(n.id) === nivelFiltro)
    : null;

  // load silencioso = não troca para "Carregando…" (evita resetar scroll)
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBrindes({ search: busca });
      setBrindes(data);
    } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { getNiveis().then(setNiveis).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => load({ silent: true }), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const brindesFiltrados = useMemo(() => {
    let lista = brindes;
    if (faixaSelecionada) {
      lista = lista.filter((b) => {
        const c = Number(b.custo_unitario || 0);
        return c >= faixaSelecionada.min && c < faixaSelecionada.max;
      });
    }
    if (nivelFiltro === 'sem') {
      lista = lista.filter((b) => !b.nivel_id);
    } else if (nivelFiltro) {
      lista = lista.filter((b) => String(b.nivel_id) === nivelFiltro);
    }
    const arr = [...lista];
    switch (ordem) {
      case 'za':           arr.sort((a, b) => (b.nome || '').localeCompare(a.nome || '', 'pt-BR')); break;
      case 'recentes':     arr.sort((a, b) => timestampDe(b) - timestampDe(a)); break;
      case 'preco_asc':    arr.sort((a, b) => Number(a.custo_unitario || 0) - Number(b.custo_unitario || 0)); break;
      case 'preco_desc':   arr.sort((a, b) => Number(b.custo_unitario || 0) - Number(a.custo_unitario || 0)); break;
      case 'estoque_asc':  arr.sort((a, b) => Number(a.quantidade_estoque || 0) - Number(b.quantidade_estoque || 0)); break;
      case 'estoque_desc': arr.sort((a, b) => Number(b.quantidade_estoque || 0) - Number(a.quantidade_estoque || 0)); break;
      case 'az':
      default:             arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    }
    return arr;
  }, [brindes, faixaSelecionada, nivelFiltro, ordem]);

  // Brindes que entram no modal de etiquetas: selecionados (se houver) OU todos os filtrados
  const brindesParaEtiquetas = useMemo(() => {
    if (selecionados.size === 0) return brindesFiltrados;
    return brindesFiltrados.filter((b) => selecionados.has(b.id));
  }, [brindesFiltrados, selecionados]);

  const setFaixa = (key) => {
    if (!key) searchParams.delete('faixa'); else searchParams.set('faixa', key);
    setSearchParams(searchParams);
  };

  const setNivel = (val) => {
    if (!val) searchParams.delete('nivel'); else searchParams.set('nivel', val);
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Cadastro de brindes</h1>
          <p className="text-slate-500 text-sm">Toque em um brinde para editar</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            className="btn-outline border-sky-300 text-sky-800 hover:bg-sky-50 flex-1 md:flex-none"
            onClick={() => setEtiquetasOpen(true)}
            title={selecionados.size > 0
              ? `Imprimir etiquetas de ${selecionados.size} selecionado(s)`
              : 'Imprimir etiquetas de todos os brindes mostrados'}
          >
            <Printer size={16} /> Etiquetas
            {selecionados.size > 0 && (
              <span className="ml-1 inline-flex items-center justify-center bg-sky-600 text-white text-[10px] font-bold rounded-full w-5 h-5">
                {selecionados.size}
              </span>
            )}
          </button>
          <button className="btn-primary flex-1 md:flex-none" onClick={() => setNovoOpen(true)}>
            <Plus size={16} /> Novo brinde
          </button>
        </div>
      </header>

      {/* Barra de seleção (aparece só quando tem itens selecionados) */}
      {selecionados.size > 0 && (
        <div className="card p-2.5 flex items-center justify-between bg-sky-50 border-sky-200 text-sm">
          <span className="text-sky-900">
            <strong>{selecionados.size}</strong> {selecionados.size === 1 ? 'brinde selecionado' : 'brindes selecionados'}
          </span>
          <button
            type="button"
            onClick={limparSelecao}
            className="text-sky-700 hover:text-sky-900 flex items-center gap-1 text-xs"
          >
            <X size={12} /> Limpar seleção
          </button>
        </div>
      )}

      <div className="card p-3 space-y-2">
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Pesquisar pelo nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-44"
            value={faixaKey}
            onChange={(e) => setFaixa(e.target.value)}
          >
            <option value="">Todas as faixas</option>
            {FAIXAS_CUSTO.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <select
            className="input sm:w-44"
            value={nivelFiltro}
            onChange={(e) => setNivel(e.target.value)}
          >
            <option value="">Todos os níveis</option>
            {niveis.filter((n) => n.ativo !== false).map((n) => (
              <option key={n.id} value={n.id}>{n.nome}</option>
            ))}
            <option value="sem">Sem nível</option>
          </select>
          <select
            className="input sm:w-44"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          >
            {ORDENACOES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {(faixaSelecionada || nivelFiltro) && (
          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
            <div className="text-slate-600 flex items-center gap-1 flex-wrap">
              Filtrando por:
              {faixaSelecionada && <span className={`badge ${faixaSelecionada.badge}`}>{faixaSelecionada.label}</span>}
              {nivelSelecionado && <span className={`badge ${badgeCor(nivelSelecionado.cor)}`}>{nivelSelecionado.nome}</span>}
              {nivelFiltro === 'sem' && <span className="badge bg-slate-100 text-slate-600">Sem nível</span>}
            </div>
            <button
              type="button"
              onClick={() => { setFaixa(''); setNivel(''); }}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <X size={12} /> Limpar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : brindesFiltrados.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {busca || faixaSelecionada
            ? 'Nenhum brinde encontrado com esses filtros.'
            : 'Nenhum brinde cadastrado. Clique em "Novo brinde" para começar.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {brindesFiltrados.map((b) => {
            const faixa = getFaixaCusto(b.custo_unitario);
            const sel = selecionados.has(b.id);
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditFor(b)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditFor(b); }}
                className={`card overflow-hidden text-left flex flex-col transition-all group cursor-pointer hover:shadow-soft active:scale-[.99] ${
                  sel ? 'ring-2 ring-sky-500 border-sky-300' : 'hover:border-brand-200'
                } ${b.status === 'inativo' ? 'opacity-60' : ''}`}
              >
                {/* Foto grande - destaque principal */}
                <div className="relative aspect-square bg-slate-100">
                  {b.foto ? (
                    <img src={b.foto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-300">
                      <Package2 size={56} />
                    </div>
                  )}
                  {/* Checkbox de seleção - canto superior esquerdo */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelecionado(b.id); }}
                    className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 grid place-items-center transition-colors shadow-sm ${
                      sel
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white/90 border-slate-300 text-transparent hover:border-sky-400'
                    }`}
                    title={sel ? 'Desmarcar' : 'Selecionar para imprimir'}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  {b.status === 'inativo' && (
                    <div className="absolute bottom-2 left-2">
                      <span className="badge bg-slate-200 text-slate-700">inativo</span>
                    </div>
                  )}
                  {faixa && (
                    <div className="absolute top-2 right-2">
                      <span className={`badge ${faixa.badge} shadow-sm`}>{faixa.label}</span>
                    </div>
                  )}
                  {b.niveis_brinde && (
                    <div className="absolute bottom-2 right-2">
                      <span className={`badge ${badgeCor(b.niveis_brinde.cor)} shadow-sm flex items-center gap-1`}>
                        <Award size={10}/> {b.niveis_brinde.nome}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info abaixo da foto */}
                <div className="p-2.5 sm:p-3 space-y-1 flex-1 flex flex-col">
                  <div className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2 min-h-[2.5rem]">
                    {b.nome}
                  </div>
                  {b.codigo && (
                    <div className="text-[11px] text-slate-500">cód. {b.codigo}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-auto pt-1 flex items-baseline justify-between">
                    <span>Estoque</span>
                    <span className={`text-base font-bold ${b.quantidade_estoque <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatInt(b.quantidade_estoque)}
                    </span>
                  </div>
                  {Number(b.custo_unitario) > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-baseline justify-between">
                      <span>Unit.</span>
                      <span className="font-semibold text-slate-700">{formatBRL(b.custo_unitario)}</span>
                    </div>
                  )}
                  {Number(b.valor_percebido) > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-baseline justify-between">
                      <span title="Valor Percebido do Produto">VPP</span>
                      <span className="font-semibold text-indigo-700">{formatBRL(b.valor_percebido)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BrindeFormModal
        open={!!editFor || novoOpen}
        brinde={editFor}
        onClose={() => { setEditFor(null); setNovoOpen(false); }}
        onSaved={() => load({ silent: true })}
      />

      <EtiquetasMassaModal
        open={etiquetasOpen}
        brindes={brindesParaEtiquetas}
        onClose={() => setEtiquetasOpen(false)}
      />
    </div>
  );
}
