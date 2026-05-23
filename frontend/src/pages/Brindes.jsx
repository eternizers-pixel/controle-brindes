import { useEffect, useState } from 'react';
import { Search, Plus, Package2 } from 'lucide-react';
import { getBrindes } from '../api/client';
import { formatBRL, formatInt, nivelClass, nivelLabel } from '../utils/helpers';
import BrindeFormModal from '../components/BrindeFormModal';

export default function Brindes() {
  const [brindes, setBrindes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [editFor, setEditFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBrindes({ search: busca });
      setBrindes(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [busca]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de brindes</h1>
          <p className="text-slate-500 text-sm">Toque em um brinde para editar</p>
        </div>
        <button className="btn-primary w-full md:w-auto" onClick={() => setNovoOpen(true)}>
          <Plus size={16} /> Novo brinde
        </button>
      </header>

      <div className="card p-3 md:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="input pl-9"
            placeholder="Pesquisar pelo nome ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : brindes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nenhum brinde encontrado.</div>
      ) : (
        <>
          {/* ============ MOBILE: cards clicáveis ============ */}
          <div className="md:hidden space-y-3">
            {brindes.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setEditFor(b)}
                className={`card p-3 w-full text-left transition-shadow hover:shadow-soft active:scale-[.99] ${
                  b.status === 'inativo' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex gap-3">
                  {b.foto ? (
                    <img src={b.foto} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                      <Package2 size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 leading-tight truncate">{b.nome}</h3>
                    {b.codigo && (
                      <div className="text-xs text-slate-500 mt-0.5">cód. {b.codigo}</div>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className={nivelClass(b.nivel_estoque)}>{nivelLabel(b.nivel_estoque)}</span>
                      <span className={b.status === 'ativo' ? 'badge bg-emerald-100 text-emerald-700' : 'badge bg-slate-100 text-slate-600'}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-2">
                    <div className="text-[10px] text-slate-500 uppercase">Estoque</div>
                    <div className={`font-semibold ${b.quantidade_estoque <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatInt(b.quantidade_estoque)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <div className="text-[10px] text-slate-500 uppercase">Unit.</div>
                    <div className="font-semibold text-slate-800 text-sm">{formatBRL(b.custo_unitario)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <div className="text-[10px] text-slate-500 uppercase">Total</div>
                    <div className="font-semibold text-emerald-700 text-sm">{formatBRL(b.valor_total)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ============ DESKTOP: tabela (linhas clicáveis) ============ */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Foto</th>
                    <th className="text-left">Nome</th>
                    <th className="text-left">Código</th>
                    <th className="text-right">Estoque</th>
                    <th className="text-right">Custo unit.</th>
                    <th className="text-right">Valor total</th>
                    <th className="text-left">Nível</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brindes.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setEditFor(b)}
                      className={`hover:bg-slate-50 cursor-pointer ${b.status === 'inativo' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-2">
                        {b.foto ? (
                          <img src={b.foto} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center text-slate-300">
                            <Package2 size={18} />
                          </div>
                        )}
                      </td>
                      <td className="font-medium text-slate-700">{b.nome}</td>
                      <td className="text-slate-500">{b.codigo || '—'}</td>
                      <td className="text-right">{formatInt(b.quantidade_estoque)}</td>
                      <td className="text-right">{formatBRL(b.custo_unitario)}</td>
                      <td className="text-right text-emerald-700 font-semibold">{formatBRL(b.valor_total)}</td>
                      <td><span className={nivelClass(b.nivel_estoque)}>{nivelLabel(b.nivel_estoque)}</span></td>
                      <td>
                        <span className={b.status === 'ativo' ? 'badge bg-emerald-100 text-emerald-700' : 'badge bg-slate-100 text-slate-600'}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <BrindeFormModal
        open={!!editFor || novoOpen}
        brinde={editFor}
        onClose={() => { setEditFor(null); setNovoOpen(false); }}
        onSaved={load}
      />
    </div>
  );
}
