// Modo kiosque: tela cheia, tudo cabe sem scroll, funciona em retrato e paisagem.
import PassoAPassoView from '../components/PassoAPassoView';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function PassoAPasso() {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col overflow-hidden">
      {/* Header compacto */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">Passo a Passo de Gravação</h1>
          <p className="text-[10px] sm:text-xs text-slate-500 leading-tight">Guia visual pra máquina laser</p>
        </div>
        <Link to="/" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Voltar ao início">
          <Home size={18}/>
        </Link>
      </header>

      {/* Conteúdo — cresce pra ocupar o resto da tela */}
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-3">
        <PassoAPassoView kiosque />
      </div>
    </div>
  );
}
