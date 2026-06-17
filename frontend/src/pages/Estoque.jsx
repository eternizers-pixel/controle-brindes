// Tela "Entregar Brinde" — fluxo simples para dar baixa em brindes
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, Package2, X, Clock } from 'lucide-react';
import { getBrindes, getReservasAtivas } from '../api/client';
import { formatInt, FAIXAS_CUSTO, getFaixaByKey } from '../utils/helpers';
import SaidaModal from '../components/SaidaModal';

const ORDENACOES = [
  { value: 'az',           label: 'Nome (A-Z)' },
  { value: 'za',           label: 'Nome (Z-A)' },
  { value: 'recentes',     label: 'Últimos cadastrados' },
  { value: 'preco_asc',    label: 'Menor preço' },
  { value: 'preco_desc',   label: 'Maior preço' },
  { value: 'estoque_desc', label: 'Maior estoque' },
  { value: 'estoque_asc',  label: 'Menor estoque' },
];

function timestampDe(b) {
  if (b.criado_em) return new Date(b.criado_em).getTime();
  return Number(b.id || 0);
}

export default function Estoque() {
  const [brindes, setBrindes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saidaFor, setSaidaFor] = useState(null);
  const [ordem, setOrdem] = useState('az');
  const [searchParams, setSearchParams] = useSearchParams();

  const faixaKey = searchParams.get('faixa') || '';
  const faixaSelecionada = faixaKey ? getFaixaByKey(faixaKey) : null;

  // load silencioso = não troca para "Carregando…" (evita resetar scroll)
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBrindes({ search: busca, status: 'ativo' });
      const resAtivas = await getReservasAtivas();
      setReservas(resAtivas);
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
    // ordenação
    const arr = [...lista];
    switch (ordem) {
      case 'za':
        arr.sort((a, b) => (b.nome || '').localeCompare(a.nome || '', 'pt-BR'));
        break;
      case 'recentes':
        arr.sort((a, b) => timestampDe(b) - timestampDe(a));
        break;
      case 'preco_asc':
        arr.sort((a, b) => Number(a.custo_unitario || 0) - Number(b.custo_unitario || 0));
        break;
      case 'preco_desc':
        arr.sort((a, b) => Number(b.custo_unitario || 0) - Number(a.custo_unitario || 0));
        break;
      case 'estoque_asc':
        arr.sort((a, b) => Number(a.quantidade_estoque || 0) - Number(b.quantidade_estoque || 0));
        break;
      case 'estoque_desc':
        arr.sort((a, b) => Number(b.quantidade_estoque || 0) - Number(a.quantidade_estoque || 0));
        break;
      case 'az':
      default:
        arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    }
    return arr;
  }, [brindes, faixaSelecionada, ordem]);

  const setFaixa = (key) => {
    if (!key) searchParams.delete('faixa'); else searchParams.set('faixa', key);
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-rose-500 text-white items-center justify-center mb-2">
          <Send size={22} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Entregar Brinde</h1>
        <p className="text-slate-500 text-sm">Toque no brinde pra entregar 1 unidade. Se for mais, toca de novo.</p>
      </header>

      <div className="card p-3 space-y-2">
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Pesquisar por nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
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
        <div className="text-slate-500">Carregando…</div>
      ) : brindesFiltrados.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {busca || faixaSelecionada ? 'Nenhum brinde encontrado com esses filtros.' : 'Nenhum brinde cadastrado ainda.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {brindesFiltrados.map((b) => {
            const reservadasCount = reservas.filter(r => r.brinde_id === b.id).length;
            const disponivel = (b.quantidade_estoque || 0) - reservadasCount;
            const sem = disponivel <= 0;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => !sem && setSaidaFor(b)}
                disabled={sem}
                className={`card overflow-hidden text-left flex flex-col transition-all group ${
                  sem
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg hover:border-rose-500 hover:ring-2 hover:ring-rose-300 hover:-translate-y-0.5 active:scale-[.98]'
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
                    <span className={`text-base font-bold ${sem ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatInt(disponivel)}
                    {reservadasCount > 0 && (
                      <span className="ml-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {reservadasCount} reservada{reservadasCount > 1 ? 's' : ''}
                      </span>
                    )}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <SaidaModal
        open={!!saidaFor}
        brinde={saidaFor}
        onClose={() => setSaidaFor(null)}
        onSaved={() => load({ silent: true })}
      />
    </div>
  );
}
