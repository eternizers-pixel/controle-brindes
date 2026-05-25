import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Boxes, DollarSign, TrendingUp, AlertTriangle, Calendar, Tag,
  HandCoins, Repeat, Wallet, LineChart,
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title,
} from 'chart.js';
import { getDashboard, getPatrocinios } from '../api/client';
import StatCard from '../components/StatCard';
import {
  formatBRL, formatInt, formatDate, labelTipo,
  labelRecorrencia, calcularInvestimentos,
  labelFormaPagamento, badgeFormaPagamento, agruparPorFormaPagamento,
} from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const PALETA = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [patrocinios, setPatrocinios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboard(), getPatrocinios({ ativo: true })])
      .then(([d, p]) => { setData(d); setPatrocinios(p); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Carregando dashboard…</div>;
  if (!data) return <div>Erro ao carregar.</div>;

  const { totais, mais_entregues, saidas_por_tipo, estoque_baixo, ultimas_saidas, top_destinatarios, faixas_custo = [] } = data;

  // métricas de patrocínios
  const invest = calcularInvestimentos(patrocinios);
  const topPatrocinados = [...patrocinios]
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, 5);
  const formaPagamentoGrupos = agruparPorFormaPagamento(patrocinios);

  const totalSocialMes =
    Number(totais.custo_entregues_mes || 0) + invest.mensal + invest.unicasNoMes;

  const barData = {
    labels: mais_entregues.map((b) => b.nome),
    datasets: [{
      label: 'Unidades entregues',
      data: mais_entregues.map((b) => b.total),
      backgroundColor: '#6366f1',
      borderRadius: 6,
    }],
  };

  const pieData = {
    labels: saidas_por_tipo.map((s) => labelTipo(s.tipo)),
    datasets: [{
      data: saidas_por_tipo.map((s) => s.total),
      backgroundColor: PALETA,
      borderWidth: 0,
    }],
  };

  // Gráfico de patrocínios por forma de pagamento (valor cadastrado)
  const formaPagamentoData = {
    labels: formaPagamentoGrupos.map((g) => g.label),
    datasets: [{
      data: formaPagamentoGrupos.map((g) => g.valor),
      backgroundColor: ['#10b981', '#f59e0b', '#0ea5e9', '#64748b', '#94a3b8'],
      borderWidth: 0,
    }],
  };

  const maxFaixaCount = Math.max(1, ...faixas_custo.map((f) => f.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Visão geral do estoque, doações e patrocínios</p>
      </header>

      {/* Métricas de brindes */}
      <div>
        <h2 className="text-xs font-semibold uppercase text-slate-500 mb-2">Brindes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Package}     label="Brindes cadastrados"    value={formatInt(totais.brindes_cadastrados)}            accent="brand" />
          <StatCard icon={Boxes}       label="Unidades em estoque"    value={formatInt(totais.unidades_em_estoque)}            accent="sky" />
          <StatCard icon={DollarSign}  label="Investido em estoque"   value={formatBRL(totais.valor_total_investido)}          accent="green" />
          <StatCard icon={TrendingUp}  label="Entregues no mês"       value={formatInt(totais.entregues_no_mes)}               accent="violet" />
        </div>
      </div>

      {/* Métricas de patrocínios */}
      <div>
        <h2 className="text-xs font-semibold uppercase text-slate-500 mb-2">Patrocínios</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={HandCoins}  label="Patrocínios ativos"     value={formatInt(patrocinios.length)}    accent="violet" />
          <StatCard icon={Repeat}     label="Mensal recorrente"      value={formatBRL(invest.mensal)}        accent="brand" />
          <StatCard icon={Calendar}   label="Investido no ano"       value={formatBRL(invest.totalAno)}      accent="green" />
          <StatCard icon={LineChart}  label="Média mensal"           value={formatBRL(invest.mediaMensal)}   accent="amber" />
        </div>
      </div>

      {/* Investimento social total */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-violet-50 border-brand-100">
        <div className="text-xs font-semibold uppercase text-slate-600 mb-1">Investimento social neste mês</div>
        <div className="text-3xl font-bold text-brand-700">{formatBRL(totalSocialMes)}</div>
        <div className="text-xs text-slate-600 mt-1">
          {formatBRL(totais.custo_entregues_mes || 0)} em brindes entregues
          {' '}+ {formatBRL(invest.mensal)} em patrocínios mensais
          {invest.unicasNoMes > 0 && (
            <> {' '}+ {formatBRL(invest.unicasNoMes)} em patrocínios únicos do mês</>
          )}
        </div>
      </div>

      {/* Top patrocinados + Forma de pagamento */}
      {(topPatrocinados.length > 0 || formaPagamentoGrupos.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {topPatrocinados.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <HandCoins size={18} className="text-violet-500" /> Top patrocinados
              </h3>
              <ul className="divide-y divide-slate-100">
                {topPatrocinados.map((p) => (
                  <li key={p.id} className="py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{p.nome}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{labelRecorrencia(p.recorrencia)}</span>
                        {p.forma_pagamento && (
                          <span className={`badge ${badgeFormaPagamento(p.forma_pagamento)}`}>
                            {labelFormaPagamento(p.forma_pagamento)}
                          </span>
                        )}
                        {p.categoria && <span>· {p.categoria}</span>}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 flex-shrink-0">{formatBRL(p.valor)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {formaPagamentoGrupos.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Wallet size={18} className="text-emerald-500" /> Patrocínios por forma de pagamento
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 items-center">
                <div style={{ height: 200 }}>
                  <Doughnut data={formaPagamentoData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }} />
                </div>
                <ul className="divide-y divide-slate-100 text-sm">
                  {formaPagamentoGrupos.map((g) => (
                    <li key={g.value} className="py-1.5 flex items-center justify-between gap-2">
                      <span className={`badge ${g.value === '__sem' ? 'bg-slate-100 text-slate-500' : badgeFormaPagamento(g.value)}`}>
                        {g.label}
                      </span>
                      <span className="text-right">
                        <span className="font-semibold text-slate-800">{formatBRL(g.valor)}</span>
                        <span className="block text-[11px] text-slate-500">{g.count} {g.count === 1 ? 'patrocínio' : 'patrocínios'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Faixas de custo + Alertas de estoque baixo (ambos sobre estoque) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Tag size={18} className="text-brand-500" /> Brindes por faixa de custo
          </h3>
          <p className="text-xs text-slate-500 mb-4">Clique numa faixa para filtrar em <strong>Entregar Brinde</strong></p>
          {faixas_custo.every((f) => f.count === 0) ? (
            <div className="text-slate-400 text-sm">Nenhum brinde cadastrado ainda.</div>
          ) : (
            <div className="space-y-2">
              {faixas_custo.map((f) => {
                const disabled = f.count === 0;
                const content = (
                  <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    disabled ? 'opacity-40' : 'hover:bg-slate-50 cursor-pointer'
                  }`}>
                    <div className="w-24 sm:w-28 flex-shrink-0">
                      <div className="text-xs sm:text-sm font-medium text-slate-700 truncate">{f.label}</div>
                      {f.count > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {formatInt(f.unidades)} un · {formatBRL(f.valor_total)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden min-w-0">
                      <div
                        className={`${f.barColor || 'bg-brand-500'} h-full rounded-full transition-all`}
                        style={{ width: `${(f.count / maxFaixaCount) * 100}%`, minWidth: f.count > 0 ? '6px' : '0' }}
                      />
                    </div>
                    <span className="w-7 text-right text-sm font-bold text-slate-800">{f.count}</span>
                  </div>
                );
                return disabled
                  ? <div key={f.key}>{content}</div>
                  : <Link key={f.key} to={`/entregar?faixa=${f.key}`} className="block">{content}</Link>;
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} /> Alertas de estoque baixo
            </h3>
            <span className="badge bg-amber-100 text-amber-700">{estoque_baixo.length}</span>
          </div>
          {estoque_baixo.length === 0 ? (
            <div className="text-slate-400 text-sm">Tudo certo!</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {estoque_baixo.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700">{b.nome}</span>
                  <span className={`text-xs font-semibold ${b.quantidade_estoque <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {b.quantidade_estoque} / mín {b.estoque_minimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Brindes mais entregues</h3>
          {mais_entregues.length === 0
            ? <div className="text-slate-400 text-sm">Sem saídas registradas ainda.</div>
            : <div style={{ height: 280 }}><Bar data={barData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }} /></div>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Saídas por tipo</h3>
          {saidas_por_tipo.length === 0
            ? <div className="text-slate-400 text-sm">Sem dados.</div>
            : <div style={{ height: 280 }}><Doughnut data={pieData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }} /></div>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar size={18} className="text-brand-500" /> Últimas saídas
          </h3>
          {ultimas_saidas.length === 0 ? (
            <div className="text-slate-400 text-sm">Nenhuma saída registrada.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ultimas_saidas.map((s) => (
                <li key={s.id} className="py-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.brinde_nome}</span>
                    <span className="text-rose-600 font-semibold">−{s.quantidade}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(s.data)} · {s.destinatario_nome || 'sem destinatário'} {s.tipo_solicitante ? `(${labelTipo(s.tipo_solicitante)})` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Destinatários que mais receberam</h3>
          {top_destinatarios.length === 0 ? (
            <div className="text-slate-400 text-sm">Sem dados ainda.</div>
          ) : (
            <>
              {/* Cards no mobile */}
              <ul className="sm:hidden divide-y divide-slate-100">
                {top_destinatarios.map((d, i) => (
                  <li key={i} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 break-words">{d.nome}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{labelTipo(d.tipo)}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-slate-800">{formatInt(d.total)}</div>
                      <div className="text-[10px] text-slate-400 uppercase">unidades</div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tabela no desktop */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                  <tr><th className="text-left py-2">Destinatário</th><th className="text-left">Tipo</th><th className="text-right">Unidades</th></tr>
                </thead>
                <tbody>
                  {top_destinatarios.map((d, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">{d.nome}</td>
                      <td className="text-slate-600">{labelTipo(d.tipo)}</td>
                      <td className="text-right font-semibold">{formatInt(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
