// Pagina dedicada pro Passo a Passo — URL direta pra usar no tablet ao lado da laser.
// Rota: /passo-a-passo
import PassoAPassoView from '../components/PassoAPassoView';

export default function PassoAPasso() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Passo a Passo de Gravação</h1>
        <p className="text-slate-500 text-sm">Guia visual pra gravar na máquina laser</p>
      </header>
      <PassoAPassoView />
    </div>
  );
}
