import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Package2, PowerOff, Power } from 'lucide-react';
import { getBrindes, atualizarBrinde } from '../api/client';
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

  const toggle = async (b) => {
    await atualizarBrinde(b.id, { status: b.status === 'ativo' ? 'inativo' : 'ativo' });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de brindes</h1>
          <p className="text-slate-500 text-sm">Lista completa dos brindes do sistema</p>
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
            placeholder="Pesquisar pelo nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : brindes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nenhum brinde cadastrado.</div>
      ) : (
        <>
          {/* ============ MOBILE: cards (md:hidden) ============ */}
          <div className="md:hidden space-y-3">
            {brindes.map((b) => (
              <div key={b.id} className={`card p-3 ${b.status === 'inativo' ? 'opacity-60' : ''}`}>
                <div className="flex gap-3">
                  {b.foto ? (
                    <img src={b.foto} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                      <Package2 size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 leading-tight truncate">{b.nome}</h3>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditFor(b)} className="text-slate-400 hover:text-brand-600 p-1" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => toggle(b)} className="text-slate-400 hover:text-rose-600 p-1"
                                title={b.status === 'ativo' ? 'Inativar' : 'Ativar'}>
                          {b.status === 'ativo' ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                      </div>
                    </div>
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
              </div>
            ))}
          </div>

          {/* ============ DESKTOP: tabela (hidden md:block) ============ */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Foto</th>
                    <th className="text-left">Nome</th>
                    <th className="text-right">Estoque</th>
                    <th className="text-right">Custo unit.</th>
                    <th className="text-right">Valor total</th>
                    <th className="text-left">Nível</th>
                    <th className="text-left">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brindes.map((b) => (
                    <tr key={b.id} className={`hover:bg-slate-50 ${b.status === 'inativo' ? 'opacity-60' : ''}`}>
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
                      <td className="text-right">{formatInt(b.quantidade_estoque)}</td>
                      <td className="text-right">{formatBRL(b.custo_unitario)}</td>
                      <td className="text-right text-emerald-700 font-semibold">{formatBRL(b.valor_total)}</td>
                      <td><span className={nivelClass(b.nivel_estoque)}>{nivelLabel(b.nivel_estoque)}</span></td>
                      <td>
                        <span className={b.status === 'ativo' ? 'badge bg-emerald-100 text-emerald-700' : 'badge bg-slate-100 text-slate-600'}>
                          {b.status}
                        </span>
                      </td>
                      <td className="pr-3 text-right whitespace-nowrap">
                        <button className="text-slate-400 hover:text-brand-600 mr-2" onClick={() => setEditFor(b)} title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button className="text-slate-400 hover:text-rose-600" onClick={() => toggle(b)}
                                title={b.status === 'ativo' ? 'Inativar' : 'Ativar'}>
                          {b.status === 'ativo' ? <PowerOff size={15} /> : <Power size={15} />}
                        </button>
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
