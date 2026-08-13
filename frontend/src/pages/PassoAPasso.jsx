// Pagina dedicada pro Passo a Passo — URL direta pra usar no tablet ao lado da laser.
// Rota: /passo-a-passo
import { Link } from 'react-router-dom';
import PassoAPassoView from '../components/PassoAPassoView';

export default function PassoAPasso() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Passo a Passo de Gravação</h1>
          <p className="text-slate-500 text-sm">Guia visual pra gravar na máquina laser</p>
        </div>
        {/* Toggle pra voltar pros Produtos */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <Link
            to="/parametros"
            className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-800 transition-all"
          >
            Produtos
          </Link>
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-slate-800">
            Passo a Passo
          </button>
        </div>
      </header>
      <PassoAPassoView />
    </div>
  );
}
