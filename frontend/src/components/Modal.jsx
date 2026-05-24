import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  // Larguras mais enxutas
  const widths = {
    sm: 'sm:max-w-xs',     // 320px
    md: 'sm:max-w-sm',     // 384px
    lg: 'sm:max-w-md',     // 448px
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${widths[size]} max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl shadow-soft`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm sm:text-base truncate pr-2">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
