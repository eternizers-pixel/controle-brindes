import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Filter, Trash2, MessageSquare } from 'lucide-react';
import { getMovimentacoes, getBrindes, removerMovimentacao } from '../api/client';
import { formatBRL, formatInt, formatDate, labelTipo, TIPOS_SOLICITANTE } from '../utils/helpers';

export default function Movimentacoes() {
  const [movs, setMovs] = useState([]);
  const [brindes, setBrindes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: '', brinde_id: '', destinatario: '', tipo_solicitante: '', inicio: '', fim: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v));
      const data = await getMovimentacoes(params);
      setMovs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { getBrindes({ status: '' }).then(setBrindes); }, []);
  useEffect(() => { load(); }, [filtros]);

  const set = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });
  const limpar = () => setFiltros({ tipo: '', brinde_id: '', destinatario: '', tipo_solicitante: '', inicio: '', fim: '' });

  const estornar = async (mov) => {
    if (!window.confirm('Estornar esta movimentação? O estoque será revertido.')) return;
    await removerMovimentacao(mov.id);
    load();
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Histórico de movimentações</h1>
        <p className="text-slate-500 text-sm">Toda entrada e saída registrada no sistema</p>
      </header>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-600 mb-3 text-sm font-medium">
          <Filter size={16} /> Filtros
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select className="input" value={filtros.tipo} onChange={set('tipo')}>
            <option value="">Tipo (todos)</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <select className="input" value={filtros.brinde_id} onChange={set('brinde_id')}>
            <option value="">Brinde (todos)</option>
            {brindes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
          <select className="input" value={filtros.tipo_solicitante} onChange={set('tipo_solicitante')}>
            <option value="">Solicitante (todos)</option>
            {TIPOS_SOLICITANTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="input" placeholder="Destinatário…" value={filtros.destinatario} onChange={set('destinatario')} />
          <input className="input" type="date" value={filtros.inicio} onChange={set('inicio')} placeholder="Início" />
          <input className="input" type="date" value={filtros.fim} onChange={set('fim')} placeholder="Fim" />
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn-ghost text-sm" onClick={limpar}>Limpar filtros</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : movs.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nenhuma movimentação encontrada.</div>
      ) : (
        <>
          {/* MOBILE: cards */}
          <div className="md:hidden space-y-2">
            {movs.map((m) => (
              <div key={m.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {m.tipo === 'entrada' ? (
                      <span className="badge bg-emerald-100 text-emerald-700"><ArrowUpCircle size={12} className="mr-1"/>Entrada</span>
                    ) : (
                      <span className="badge bg-rose-100 text-rose-700"><ArrowDownCircle size={12} className="mr-1"/>Saída</span>
                    )}
                    <span className="text-xs text-slate-500">{formatDate(m.data)}</span>
                  </div>
                  <button className="text-slate-400 hover:text-rose-600" onClick={() => estornar(m)} title="Estornar">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="font-medium text-slate-800 truncate">{m.brinde_nome}</div>
                  <div className={`font-bold ${m.tipo === 'saida' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {m.tipo === 'saida' ? '−' : '+'}{formatInt(m.quantidade)}
                  </div>
                </div>
                {(m.destinatario_nome || m.tipo_solicitante) && (
                  <div className="text-xs text-slate-600 mt-1">
                    {m.destinatario_nome || '—'}{m.tipo_solicitante ? ` (${labelTipo(m.tipo_solicitante)})` : ''}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-0.5">{formatBRL(m.custo_total)}</div>
                {m.observacao && (
                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2 flex items-start gap-1.5">
                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-slate-400"/>
                    <span className="italic">{m.observacao}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP: tabela */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left">Tipo</th>
                    <th className="text-left">Brinde</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-left">Para quem</th>
                    <th className="text-left">Solicitante</th>
                    <th className="text-left">Observação</th>
                    <th className="text-right">Custo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movs.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(m.data)}</td>
                      <td>
                        {m.tipo === 'entrada' ? (
                          <span className="badge bg-emerald-100 text-emerald-700"><ArrowUpCircle size={12} className="mr-1"/>Entrada</span>
                        ) : (
                          <span className="badge bg-rose-100 text-rose-700"><ArrowDownCircle size={12} className="mr-1"/>Saída</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-700">{m.brinde_nome}</td>
                      <td className={`text-right font-semibold ${m.tipo === 'saida' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {m.tipo === 'saida' ? '−' : '+'}{formatInt(m.quantidade)}
                      </td>
                      <td>{m.destinatario_nome || '—'}</td>
                      <td className="text-slate-600">{labelTipo(m.tipo_solicitante) || '—'}</td>
                      <td className="text-slate-500 italic max-w-xs truncate" title={m.observacao || ''}>
                        {m.observacao || '—'}
                      </td>
                      <td className="text-right">{formatBRL(m.custo_total)}</td>
                      <td className="text-right pr-3">
                        <button className="text-slate-400 hover:text-rose-600" title="Estornar"
                                onClick={() => estornar(m)}>
                          <Trash2 size={15} />
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
    </div>
  );
}
