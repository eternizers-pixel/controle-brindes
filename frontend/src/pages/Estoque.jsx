// Tela "Entregar Brinde" — fluxo simples para dar baixa em brindes
import { useEffect, useState } from 'react';
import { Search, Send, Package2 } from 'lucide-react';
import { getBrindes } from '../api/client';
import { formatInt, nivelClass, nivelLabel } from '../utils/helpers';
import SaidaModal from '../components/SaidaModal';

export default function Estoque() {
  const [brindes, setBrindes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saidaFor, setSaidaFor] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBrindes({ search: busca, status: 'ativo' });
      setBrindes(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [busca]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <header className="text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-rose-500 text-white items-center justify-center mb-2">
          <Send size={22} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Entregar Brinde</h1>
        <p className="text-slate-500 text-sm">Toque em um brinde para dar baixa no estoque</p>
      </header>

      <div className="card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="input pl-9"
            placeholder="Pesquisar por nome ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Carregando…</div>
      ) : brindes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {busca ? 'Nenhum brinde encontrado.' : 'Nenhum brinde cadastrado ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {brindes.map((b) => {
            const sem = b.quantidade_estoque <= 0;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => !sem && setSaidaFor(b)}
                disabled={sem}
                className={`card p-3 w-full text-left flex items-center gap-3 transition-all ${
                  sem ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-soft active:scale-[.99] hover:bg-rose-50'
                }`}
              >
                {b.foto ? (
                  <img src={b.foto} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                    <Package2 size={32} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">{b.nome}</span>
                    <span className={nivelClass(b.nivel_estoque)}>{nivelLabel(b.nivel_estoque)}</span>
                  </div>
                  {b.codigo && (
                    <div className="text-xs text-slate-500 mt-0.5">cód. {b.codigo}</div>
                  )}
                  <div className="text-xs text-slate-500">
                    Disponível: <span className={`font-semibold ${sem ? 'text-rose-600' : 'text-slate-700'}`}>{formatInt(b.quantidade_estoque)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-rose-500 font-medium text-sm hidden sm:block">
                  Dar baixa →
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
        onSaved={load}
      />
    </div>
  );
}
