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
    sm: 'max-w-xs',     // 320px
    md: 'max-w-sm',     // 384px
    lg: 'max-w-md',     // 448px
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${widths[size]} max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-soft my-auto`}
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
