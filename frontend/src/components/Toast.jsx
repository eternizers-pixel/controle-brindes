// Sistema simples de notificações (toasts) via React Context
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext({ show: () => {}, success: () => {}, error: () => {}, info: () => {} });

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const show = useCallback((msg, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => remove(id), duration);
  }, []);

  const api = {
    show,
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error', 5000),
    info:    (msg) => show(msg, 'info'),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-3 inset-x-3 sm:top-4 sm:right-4 sm:inset-x-auto sm:max-w-sm z-[60] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function Toast({ msg, type, onClose }) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
  const colors = {
    success: 'border-l-emerald-500 text-emerald-600',
    error:   'border-l-rose-500 text-rose-600',
    info:    'border-l-brand-500 text-brand-600',
  }[type];
  return (
    <div
      className={`pointer-events-auto bg-white rounded-xl shadow-soft border border-slate-100 border-l-4 px-3 py-2.5 flex items-start gap-2.5 ${colors}`}
      style={{ animation: 'slideDownFade .25s ease-out' }}
    >
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <span className="text-sm text-slate-700 flex-1">{msg}</span>
      <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
