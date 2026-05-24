import { Link } from 'react-router-dom';
import { HandHeart, Package, BarChart3, History, FileText, Gift } from 'lucide-react';

const cards = [
  {
    to: '/doacao',
    icon: HandHeart,
    title: 'Realizar Doação',
    desc: 'Dar baixa em brindes entregues',
    cardBg: 'bg-rose-50 hover:bg-rose-100 border-rose-100',
    iconBg: 'bg-rose-500',
    iconText: 'text-white',
  },
  {
    to: '/brindes',
    icon: Package,
    title: 'Cadastro de Brindes',
    desc: 'Adicionar, editar e repor estoque',
    cardBg: 'bg-brand-50 hover:bg-brand-100 border-brand-100',
    iconBg: 'bg-brand-600',
    iconText: 'text-white',
  },
  {
    to: '/dashboard',
    icon: BarChart3,
    title: 'Dashboard',
    desc: 'Indicadores e visão geral',
    cardBg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
    iconBg: 'bg-emerald-600',
    iconText: 'text-white',
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
        <p className="text-slate-500 mt-1 text-sm">Estoque e entregas, simples e organizado</p>
      </header>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className={`${c.cardBg} border rounded-2xl p-5 sm:p-6 transition-all active:scale-[.99] flex flex-col items-center text-center gap-3 hover:shadow-soft`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${c.iconBg} ${c.iconText} grid place-items-center`}>
                <Icon size={24} />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-base sm:text-lg">{c.title}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">{c.desc}</div>
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
