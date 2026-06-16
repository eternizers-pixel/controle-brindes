import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home as HomeIcon, Package, History, FileText, Gift, Send, BarChart3, HandCoins, Search, Settings2,
  Moon, Sun, Award,
} from 'lucide-react';

const links = [
  { to: '/',              label: 'Início',              mobile: 'Início',    icon: HomeIcon },
  { to: '/entregar',      label: 'Entregar Brinde',     mobile: 'Entregar',  icon: Send },
  { to: '/brindes',       label: 'Cadastro de Brindes', mobile: 'Brindes',   icon: Package },
  { to: '/niveis',        label: 'Níveis de brinde',    mobile: 'Níveis',    icon: Award },
  { to: '/parametros',    label: 'Parâmetros',          mobile: 'Param.',    icon: Settings2 },
  { to: '/patrocinios',   label: 'Patrocínios',         mobile: 'Patroc.',   icon: HandCoins },
  { to: '/dashboard',     label: 'Dashboard',           mobile: 'Dashboard', icon: BarChart3 },
  { to: '/movimentacoes', label: 'Histórico',           mobile: 'Histórico', icon: History },
  { to: '/relatorios',    label: 'Relatórios',          mobile: 'Relat.',    icon: FileText },
  { to: '/pesquisa-xbz',  label: 'Pesquisa XBZ',        mobile: 'XBZ',       icon: Search },
];

const mobileLinks = links.filter((l) => ['/', '/entregar', '/brindes', '/parametros', '/patrocinios', '/dashboard'].includes(l.to));

// Hook do modo escuro com persistência em localStorage + respeito ao OS
function useModoEscuro() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('dark-mode', String(dark));
  }, [dark]);
  return [dark, setDark];
}

function BotaoModo({ dark, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors
                  text-slate-600 hover:bg-slate-100
                  dark:text-slate-300 dark:hover:bg-slate-700 ${className}`}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      aria-label={dark ? 'Mudar pra modo claro' : 'Mudar pra modo escuro'}
    >
      {dark ? <Sun size={18}/> : <Moon size={18}/>}
    </button>
  );
}

export default function Layout() {
  const [dark, setDark] = useModoEscuro();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="w-60 bg-white border-r border-slate-200 hidden md:flex flex-col
                        dark:bg-slate-800 dark:border-slate-700">
        <Link to="/" className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50
                                dark:border-slate-700 dark:hover:bg-slate-700">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center">
            <Gift size={18} />
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-tight dark:text-slate-100">Controle</div>
            <div className="text-xs text-slate-500 leading-tight dark:text-slate-400">de Brindes</div>
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
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 flex items-center justify-between dark:border-slate-700">
          <span className="text-xs text-slate-400 dark:text-slate-500">v1.0</span>
          <BotaoModo dark={dark} onToggle={() => setDark((v) => !v)} />
        </div>
      </aside>

      {/* Top bar mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 z-30 px-4 py-3
                      flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700">
        <Link to="/" className="flex items-center gap-2 flex-1 hover:bg-slate-50 -mx-2 px-2 py-1 rounded
                                dark:hover:bg-slate-700">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center">
            <Gift size={14} />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">Controle de Brindes</span>
        </Link>
        <BotaoModo dark={dark} onToggle={() => setDark((v) => !v)} />
      </div>

      <main className="flex-1 md:p-8 p-4 pt-16 md:pt-8 pb-28 md:pb-8 min-w-0">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-6 z-30
                      dark:bg-slate-800 dark:border-slate-700">
        {mobileLinks.map(({ to, mobile, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
          >
            <Icon size={18} /> {mobile}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
