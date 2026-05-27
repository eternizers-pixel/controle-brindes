import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Package2, X } from 'lucide-react';
import { getBrindes } from '../api/client';
import { formatBRL, formatInt, FAIXAS_CUSTO, getFaixaCusto, getFaixaByKey } from '../utils/helpers';
import BrindeFormModal from '../components/BrindeFormModal';

const ORDENACOES = [
  { value: 'az',           label: 'Nome (A-Z)' },
  { value: 'za',           label: 'Nome (Z-A)' },
  { value: 'preco_asc',    label: 'Menor preço' },
  { value: 'preco_desc',   label: 'Maior preço' },
  { value: 'estoque_desc', label: 'Maior estoque' },
  { value: 'estoque_asc',  label: 'Menor estoque' },
];

export default function Brindes() {
  const [brindes, setBrindes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [editFor, setEditFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [ordem, setOrdem] = useState('az');
  const [searchParams, setSearchParams] = useSearchParams();

  const faixaKey = searchParams.get('faixa') || '';
  const faixaSelecionada = faixaKey ? getFaixaByKey(faixaKey) : null;

  // load silencioso = não troca para "Carregando…" (evita resetar scroll)
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBrindes({ search: busca });
      setBrindes(data);
    } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, []);
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
    const arr = [...lista];
    switch (ordem) {
      case 'za':           arr.sort((a, b) => (b.nome || '').localeCompare(a.nome || '', 'pt-BR')); break;
      case 'preco_asc':    arr.sort((a, b) => Number(a.custo_unitario || 0) - Number(b.custo_unitario || 0)); break;
      case 'preco_desc':   arr.sort((a, b) => Number(b.custo_unitario || 0) - Number(a.custo_unitario || 0)); break;
      case 'estoque_asc':  arr.sort((a, b) => Number(a.quantidade_estoque || 0) - Number(b.quantidade_estoque || 0)); break;
      case 'estoque_desc': arr.sort((a, b) => Number(b.quantidade_estoque || 0) - Number(a.quantidade_estoque || 0)); break;
      case 'az':
      default:             arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    }
    return arr;
  }, [brindes, faixaSelecionada, ordem]);

  const setFaixa = (key) => {
    if (!key) searchParams.delete('faixa'); else searchParams.set('faixa', key);
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Cadastro de brindes</h1>
          <p className="text-slate-500 text-sm">Toque em um brinde para editar</p>
        </div>
        <button className="btn-primary w-full md:w-auto" onClick={() => setNovoOpen(true)}>
          <Plus size={16} /> Novo brinde
        </button>
      </header>

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
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          >
            {ORDENACOES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {faixaSelecionada && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Filtrando por: <span className={`badge ${faixaSelecionada.badge}`}>{faixaSelecionada.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setFaixa('')}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <X size={12} /> Limpar filtro
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
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setEditFor(b)}
                className={`card overflow-hidden text-left flex flex-col transition-all group hover:shadow-soft active:scale-[.99] hover:border-brand-200 ${
                  b.status === 'inativo' ? 'opacity-60' : ''
                }`}
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
                  {b.status === 'inativo' && (
                    <div className="absolute top-2 left-2">
                      <span className="badge bg-slate-200 text-slate-700">inativo</span>
                    </div>
                  )}
                  {faixa && (
                    <div className="absolute top-2 right-2">
                      <span className={`badge ${faixa.badge} shadow-sm`}>{faixa.label}</span>
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
                </div>
              </button>
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
    </div>
  );
}
