import { Link } from 'react-router-dom';
import { Send, Package, BarChart3, History, FileText, Gift, HandCoins, Settings2 } from 'lucide-react';

const cards = [
  {
    to: '/entregar',
    icon: Send,
    title: 'Entregar Brinde',
    desc: 'Dar baixa em brindes entregues',
    cardBg: 'bg-rose-50 hover:bg-rose-100 border-rose-100',
    iconBg: 'bg-rose-500',
  },
  {
    to: '/brindes',
    icon: Package,
    title: 'Cadastro de Brindes',
    desc: 'Adicionar, editar e repor estoque',
    cardBg: 'bg-brand-50 hover:bg-brand-100 border-brand-100',
    iconBg: 'bg-brand-600',
  },
  {
    to: '/parametros',
    icon: Settings2,
    title: 'Parâmetros',
    desc: 'Configurações de gravação',
    cardBg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-100',
    iconBg: 'bg-indigo-500',
  },
  {
    to: '/patrocinios',
    icon: HandCoins,
    title: 'Patrocínios',
    desc: 'Acompanhar investimentos sociais',
    cardBg: 'bg-violet-50 hover:bg-violet-100 border-violet-100',
    iconBg: 'bg-violet-500',
  },
  {
    to: '/dashboard',
    icon: BarChart3,
    title: 'Dashboard',
    desc: 'Indicadores e visão geral',
    cardBg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
    iconBg: 'bg-emerald-600',
  },
];

const secondary = [
  { to: '/movimentacoes', icon: History,  label: 'Histórico de movimentações' },
  { to: '/relatorios',    icon: FileText, label: 'Relatórios e exportações' },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto">
      <header className="text-center mb-8 mt-2">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white grid place-items-center shadow-soft">
            <Gift size={28} />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Controle de Brindes</h1>
        <p className="text-slate-500 mt-1 text-sm">Estoque, doações e patrocínios em um só lugar</p>
      </header>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className={`${c.cardBg} border rounded-2xl p-5 transition-all active:scale-[.99] flex flex-col items-center text-center gap-3 hover:shadow-soft`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${c.iconBg} text-white grid place-items-center`}>
                <Icon size={24} />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-sm sm:text-base">{c.title}</div>
                <div className="text-xs text-slate-500 mt-1">{c.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {secondary.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="card p-3 hover:bg-slate-50 flex items-center gap-3"
          >
            <Icon size={18} className="text-slate-500" />
            <span className="text-sm text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
