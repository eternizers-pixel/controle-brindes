import { useEffect, useState } from 'react';
import {
  Package, Boxes, DollarSign, TrendingUp, AlertTriangle, Calendar, Tag,
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title,
} from 'chart.js';
import { getDashboard } from '../api/client';
import StatCard from '../components/StatCard';
import { formatBRL, formatInt, formatDate, labelTipo } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const PALETA = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboard().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Carregando dashboard…</div>;
  if (!data) return <div>Erro ao carregar.</div>;

  const { totais, mais_entregues, saidas_por_tipo, estoque_baixo, ultimas_saidas, top_destinatarios, faixas_custo = [] } = data;

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

  const maxFaixaCount = Math.max(1, ...faixas_custo.map((f) => f.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Visão geral do estoque e das entregas</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package}     label="Brindes cadastrados"    value={formatInt(totais.brindes_cadastrados)}            accent="brand" />
        <StatCard icon={Boxes}       label="Unidades em estoque"    value={formatInt(totais.unidades_em_estoque)}            accent="sky" />
        <StatCard icon={DollarSign}  label="Investido em estoque"   value={formatBRL(totais.valor_total_investido)}          accent="green" />
        <StatCard icon={TrendingUp}  label="Entregues no mês"       value={formatInt(totais.entregues_no_mes)}               accent="violet" />
      </div>

      {/* Faixas de custo dos brindes */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Tag size={18} className="text-brand-500" /> Brindes por faixa de custo
        </h3>
        <p className="text-xs text-slate-500 mb-4">Distribuição com base no custo unitário</p>
        {faixas_custo.every((f) => f.count === 0) ? (
          <div className="text-slate-400 text-sm">Nenhum brinde cadastrado ainda.</div>
        ) : (
          <div className="space-y-3">
            {faixas_custo.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-28 sm:w-32 flex-shrink-0">
                  <div className="text-xs sm:text-sm font-medium text-slate-700">{f.label}</div>
                  {f.count > 0 && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatInt(f.unidades)} un · {formatBRL(f.valor_total)}
                    </div>
                  )}
                </div>
                <div className="flex-1 mt-1.5 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all"
                    style={{ width: `${(f.count / maxFaixaCount) * 100}%`, minWidth: f.count > 0 ? '6px' : '0' }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-slate-700 mt-0.5">{f.count}</span>
              </div>
            ))}
          </div>
        )}
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
          <h3 className="font-semibold text-slate-800 mb-4">Saídas por tipo de solicitante</h3>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} /> Alertas de estoque baixo
            </h3>
            <span className="badge bg-amber-100 text-amber-700">{estoque_baixo.length}</span>
          </div>
          {estoque_baixo.length === 0 ? (
            <div className="text-slate-400 text-sm">Tudo certo! Nenhum brinde com estoque baixo.</div>
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
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Destinatários que mais receberam</h3>
        {top_destinatarios.length === 0 ? (
          <div className="text-slate-400 text-sm">Sem dados ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
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
          </div>
        )}
      </div>
    </div>
  );
}
