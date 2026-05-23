import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, Boxes, History, FileText, Gift,
} from 'lucide-react';

const links = [
  { to: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/estoque',       label: 'Estoque',       icon: Boxes },
  { to: '/brindes',       label: 'Brindes',       icon: Package },
  { to: '/movimentacoes', label: 'Movimentações', icon: History },
  { to: '/relatorios',    label: 'Relatórios',    icon: FileText },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center">
            <Gift size={18} />
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-tight">Controle</div>
            <div className="text-xs text-slate-500 leading-tight">de Brindes</div>
          </div>
        </div>

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

        <div className="p-4 text-xs text-slate-400 border-t border-slate-100">
          v1.0 · Sistema interno
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center gap-2">
        <Gift className="text-brand-600" size={20} />
        <span className="font-semibold">Controle de Brindes</span>
      </div>

      <main className="flex-1 bg-slate-50 md:p-8 p-4 pt-16 md:pt-8 pb-28 md:pb-8 min-w-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-5 z-30">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`}
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
