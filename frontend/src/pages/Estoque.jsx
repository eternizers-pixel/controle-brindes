import { useEffect, useState } from 'react';
import { Search, Plus, AlertTriangle } from 'lucide-react';
import { getBrindes } from '../api/client';
import BrindeCard from '../components/BrindeCard';
import EntradaModal from '../components/EntradaModal';
import SaidaModal from '../components/SaidaModal';
import BrindeFormModal from '../components/BrindeFormModal';

export default function Estoque() {
  const [brindes, setBrindes] = useState([]);
  const [busca, setBusca] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativo');
  const [loading, setLoading] = useState(true);

  const [entradaFor, setEntradaFor] = useState(null);
  const [saidaFor,   setSaidaFor]   = useState(null);
  const [editFor,    setEditFor]    = useState(null);
  const [novoOpen,   setNovoOpen]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBrindes({ search: busca, status: statusFilter || undefined });
      setBrindes(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [busca]);

  const baixos = brindes.filter((b) => b.nivel_estoque !== 'saudavel').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
          <p className="text-slate-500 text-sm">Gerencie entradas e saídas dos brindes</p>
        </div>
        <button className="btn-primary" onClick={() => setNovoOpen(true)}>
          <Plus size={16} /> Novo brinde
        </button>
      </header>

      {baixos > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          <strong>{baixos}</strong> brinde(s) com estoque baixo ou zerado — confira abaixo.
        </div>
      )}

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="input pl-9"
            placeholder="Pesquisar brinde pelo nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select className="input md:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Apenas ativos</option>
          <option value="inativo">Apenas inativos</option>
        </select>
      </div>

      {loading ? (
        <div className="text-slate-500">Carregando…</div>
      ) : brindes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Nenhum brinde encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brindes.map((b) => (
            <BrindeCard
              key={b.id} brinde={b}
              onEntrada={setEntradaFor}
              onSaida={setSaidaFor}
              onEdit={setEditFor}
            />
          ))}
        </div>
      )}

      <EntradaModal open={!!entradaFor} brinde={entradaFor} onClose={() => setEntradaFor(null)} onSaved={load} />
      <SaidaModal   open={!!saidaFor}   brinde={saidaFor}   onClose={() => setSaidaFor(null)}   onSaved={load} />
      <BrindeFormModal
        open={!!editFor || novoOpen}
        brinde={editFor}
        onClose={() => { setEditFor(null); setNovoOpen(false); }}
        onSaved={load}
      />
    </div>
  );
}
