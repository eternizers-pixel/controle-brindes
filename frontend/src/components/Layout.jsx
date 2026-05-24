import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home as HomeIcon, Package, History, FileText, Gift, HandHeart, BarChart3, HandCoins,
} from 'lucide-react';

const links = [
  { to: '/',              label: 'Início',              mobile: 'Início',    icon: HomeIcon },
  { to: '/doacao',        label: 'Realizar Doação',     mobile: 'Doação',    icon: HandHeart },
  { to: '/brindes',       label: 'Cadastro de Brindes', mobile: 'Brindes',   icon: Package },
  { to: '/patrocinios',   label: 'Patrocínios',         mobile: 'Patroc.',   icon: HandCoins },
  { to: '/dashboard',     label: 'Dashboard',           mobile: 'Dashboard', icon: BarChart3 },
  { to: '/movimentacoes', label: 'Histórico',           mobile: 'Histórico', icon: History },
  { to: '/relatorios',    label: 'Relatórios',          mobile: 'Relat.',    icon: FileText },
];

// 5 mais usados na nav inferior do mobile
const mobileLinks = links.filter((l) => ['/', '/doacao', '/brindes', '/patrocinios', '/dashboard'].includes(l.to));

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="w-60 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <Link to="/" className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center">
            <Gift size={18} />
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-tight">Controle</div>
            <div className="text-xs text-slate-500 leading-tight">de Brindes</div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 text-xs text-slate-400 border-t border-slate-100">v1.0</div>
      </aside>

      {/* Top bar mobile */}
      <Link to="/" className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center gap-2 hover:bg-slate-50">
        <div className="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center">
          <Gift size={14} />
        </div>
        <span className="font-semibold text-slate-800">Controle de Brindes</span>
      </Link>

      <main className="flex-1 bg-slate-50 md:p-8 p-4 pt-16 md:pt-8 pb-28 md:pb-8 min-w-0">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 z-30">
        {mobileLinks.map(({ to, mobile, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`}
          >
            <Icon size={18} /> {mobile}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
