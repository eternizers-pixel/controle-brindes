import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, HandCoins, Calendar, LineChart, X } from 'lucide-react';
import { getPatrocinios } from '../api/client';
import { formatBRL, formatDate, labelRecorrencia, valorMensalPatrocinio, calcularInvestimentos, labelFormaPagamento, badgeFormaPagamento } from '../utils/helpers';
import PatrocinioFormModal from '../components/PatrocinioFormModal';

export default function Patrocinios() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('ativo'); // ativo | inativo | todos
  const [filtroMes, setFiltroMes] = useState(''); // '' ou 'YYYY-MM'
  const [loading, setLoading] = useState(true);
  const [editFor, setEditFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { search: busca };
      if (filtro === 'ativo')   params.ativo = true;
      if (filtro === 'inativo') params.ativo = false;
      const data = await getPatrocinios(params);
      setLista(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filtro]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [busca]);

  // Aplica filtro de mês JS-side.
  // Lógica: única vez entra se data_inicio está no mês selecionado.
  // Recorrente entra se estava ativo naquele mês (data_inicio <= mês <= data_fim ou sem fim).
  const listaFiltrada = useMemo(() => {
    if (!filtroMes) return lista;
    return lista.filter((p) => {
      const inicio = (p.data_inicio || '').slice(0, 7);
      const fim    = (p.data_fim    || '').slice(0, 7);
      if (p.recorrencia === 'unica') return inicio === filtroMes;
      if (inicio > filtroMes) return false;
      if (fim && fim < filtroMes) return false;
      return true;
    });
  }, [lista, filtroMes]);

  const totais = calcularInvestimentos(lista);

  // Formata 'YYYY-MM' como 'maio de 2026' pra mensagem
  const formatarMes = (yyyymm) => {
    if (!yyyymm) return '';
    const [y, m] = yyyymm.split('-');
    const data = new Date(Number(y), Number(m) - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Patrocínios</h1>
          <p className="text-slate-500 text-sm">Acompanhe quem você apoia e quanto investe</p>
        </div>
        <button className="btn-primary w-full md:w-auto" onClick={() => setNovoOpen(true)}>
          <Plus size={16} /> Novo patrocínio
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 grid place-items-center">
            <HandCoins size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Mensal recorrente</div>
            <div className="text-lg font-bold text-slate-800">{formatBRL(totais.mensal)}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 grid place-items-center">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Investido no ano</div>
            <div className="text-lg font-bold text-emerald-700">{formatBRL(totais.totalAno)}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 grid place-items-center">
            <LineChart size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Média mensal</div>
            <div className="text-lg font-bold text-slate-800">{formatBRL(totais.mediaMensal)}</div>
          </div>
        </div>
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input className="input pl-9" placeholder="Pesquisar patrocinado…"
                   value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <input
            type="month"
            className="input sm:w-40"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            title="Filtrar por mês"
          />
          <select className="input sm:w-40" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="ativo">Apenas ativos</option>
            <option value="inativo">Apenas inativos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        {filtroMes && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Mostrando patrocínios <strong>de {formatarMes(filtroMes)}</strong>
              <span className="text-slate-400 ml-1">
                ({listaFiltrada.length} {listaFiltrada.length === 1 ? 'registro' : 'registros'})
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFiltroMes('')}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <X size={12} /> Limpar mês
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {filtroMes
            ? `Nenhum patrocínio em ${formatarMes(filtroMes)}.`
            : busca
              ? 'Nenhum patrocínio encontrado.'
              : 'Nenhum patrocínio cadastrado ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {listaFiltrada.map((p) => {
            const mensal = valorMensalPatrocinio(p);
            const recorrente = p.recorrencia !== 'unica';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setEditFor(p)}
                className={`card p-3 w-full text-left flex items-start gap-3 transition-all hover:shadow-soft active:scale-[.99] hover:bg-slate-50 ${
                  !p.ativo ? 'opacity-60' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 grid place-items-center flex-shrink-0">
                  <HandCoins size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">{p.nome}</span>
                    <span className="badge bg-violet-100 text-violet-700">{labelRecorrencia(p.recorrencia)}</span>
                    {p.forma_pagamento && (
                      <span className={`badge ${badgeFormaPagamento(p.forma_pagamento)}`}>
                        {labelFormaPagamento(p.forma_pagamento)}
                      </span>
                    )}
                    {p.categoria && <span className="badge bg-orange-100 text-orange-700">{p.categoria}</span>}
                    {!p.ativo && <span className="badge bg-slate-200 text-slate-600">inativo</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {p.recorrencia === 'unica' ? (
                      <>Data do patrocínio: {formatDate(p.data_inicio)}</>
                    ) : (
                      <>
                        Início: {formatDate(p.data_inicio)}
                        {p.data_fim && ` · Fim: ${formatDate(p.data_fim)}`}
                      </>
                    )}
                  </div>
                  {p.observacao && (
                    <div className="text-xs text-slate-600 italic mt-1 line-clamp-2">{p.observacao}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-bold text-slate-800">{formatBRL(p.valor)}</div>
                  {recorrente && (
                    <div className="text-[11px] text-slate-500">≈ {formatBRL(mensal)}/mês</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <PatrocinioFormModal
        open={!!editFor || novoOpen}
        patrocinio={editFor}
        onClose={() => { setEditFor(null); setNovoOpen(false); }}
        onSaved={load}
      />
    </div>
  );
}
