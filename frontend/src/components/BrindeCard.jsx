import { Plus, Minus, Package2, Pencil, AlertTriangle } from 'lucide-react';
import { formatBRL, formatInt, nivelClass, nivelLabel } from '../utils/helpers';

export default function BrindeCard({ brinde, onEntrada, onSaida, onEdit }) {
  const sem = brinde.quantidade_estoque <= 0;
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="relative bg-slate-100 aspect-[4/3] flex items-center justify-center overflow-hidden">
        {brinde.foto ? (
          <img src={brinde.foto} alt={brinde.nome} className="w-full h-full object-cover" />
        ) : (
          <Package2 className="text-slate-300" size={56} />
        )}
        <span className={`${nivelClass(brinde.nivel_estoque)} absolute top-2 right-2`}>
          {nivelLabel(brinde.nivel_estoque)}
        </span>
        {brinde.categoria_nome && (
          <span className="absolute top-2 left-2 badge-blue badge"
                style={brinde.categoria_cor ? { backgroundColor: brinde.categoria_cor + '22', color: brinde.categoria_cor } : {}}>
            {brinde.categoria_nome}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-800 leading-tight">{brinde.nome}</h3>
          <button onClick={() => onEdit(brinde)} className="text-slate-400 hover:text-brand-600" title="Editar">
            <Pencil size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[2.5rem]">
          {brinde.descricao || '—'}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-lg py-2">
            <div className="text-[10px] text-slate-500 uppercase">Estoque</div>
            <div className={`font-semibold ${sem ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatInt(brinde.quantidade_estoque)}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg py-2">
            <div className="text-[10px] text-slate-500 uppercase">Unit.</div>
            <div className="font-semibold text-slate-800 text-sm">{formatBRL(brinde.custo_unitario)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg py-2">
            <div className="text-[10px] text-slate-500 uppercase">Total</div>
            <div className="font-semibold text-emerald-700 text-sm">{formatBRL(brinde.valor_total)}</div>
          </div>
        </div>

        {brinde.nivel_estoque !== 'saudavel' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
            <AlertTriangle size={14} />
            Estoque mínimo: {formatInt(brinde.estoque_minimo)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => onEntrada(brinde)} className="btn-success">
            <Plus size={16} /> Entrada
          </button>
          <button onClick={() => onSaida(brinde)} disabled={sem}
                  className={`btn-danger ${sem ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <Minus size={16} /> Saída
          </button>
        </div>
      </div>
    </div>
  );
}
