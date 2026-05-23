import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Filter, Trash2 } from 'lucide-react';
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Histórico de movimentações</h1>
        <p className="text-slate-500 text-sm">Toda entrada e saída registrada no sistema</p>
      </header>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-600 mb-3 text-sm font-medium">
          <Filter size={16} /> Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
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
          <input className="input" type="date" value={filtros.inicio} onChange={set('inicio')} />
          <input className="input" type="date" value={filtros.fim} onChange={set('fim')} />
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn-ghost" onClick={limpar}>Limpar filtros</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Carregando…</div>
        ) : movs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhuma movimentação encontrada.</div>
        ) : (
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
                  <th className="text-left">Responsável</th>
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
                        <span className="badge-green badge"><ArrowUpCircle size={12} className="mr-1"/>Entrada</span>
                      ) : (
                        <span className="badge-red badge"><ArrowDownCircle size={12} className="mr-1"/>Saída</span>
                      )}
                    </td>
                    <td className="font-medium text-slate-700">{m.brinde_nome}</td>
                    <td className={`text-right font-semibold ${m.tipo === 'saida' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {m.tipo === 'saida' ? '−' : '+'}{formatInt(m.quantidade)}
                    </td>
                    <td>{m.destinatario_nome || '—'}</td>
                    <td className="text-slate-600">{labelTipo(m.tipo_solicitante) || '—'}</td>
                    <td className="text-slate-600">{m.responsavel || '—'}</td>
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
        )}
      </div>
    </div>
  );
}
