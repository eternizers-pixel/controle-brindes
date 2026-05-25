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
    <div className="space-y-4 max-w-6xl mx-auto">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {brindes.map((b) => {
            const sem = b.quantidade_estoque <= 0;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => !sem && setSaidaFor(b)}
                disabled={sem}
                className={`card overflow-hidden text-left flex flex-col transition-all group ${
                  sem ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-soft active:scale-[.99] hover:border-rose-200'
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
                  {/* Badge de nível no canto */}
                  <div className="absolute top-2 left-2">
                    <span className={nivelClass(b.nivel_estoque)}>{nivelLabel(b.nivel_estoque)}</span>
                  </div>
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
                      {formatInt(b.quantidade_estoque)}
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
        onSaved={load}
      />
    </div>
  );
}
