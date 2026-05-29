import { useState, useEffect, useMemo } from 'react';
import { Printer, Search, Package2, CheckSquare, Square } from 'lucide-react';
import Modal from './Modal';
import { imprimirEtiquetas } from '../utils/etiquetas';

// Modal para imprimir etiquetas de vários brindes de uma vez.
// `brindes` = lista pré-carregada (ex: a mesma exibida no Cadastro de Brindes)
export default function EtiquetasMassaModal({ open, brindes = [], onClose }) {
  const [busca, setBusca] = useState('');
  // { [brindeId]: { selecionado: bool, qtd: number } }
  const [estado, setEstado] = useState({});

  // Inicializa: seleciona todos com estoque > 0, qtd = estoque
  useEffect(() => {
    if (!open) return;
    const inicial = {};
    for (const b of brindes) {
      inicial[b.id] = {
        selecionado: (b.quantidade_estoque || 0) > 0,
        qtd: Math.max(1, Number(b.quantidade_estoque) || 1),
      };
    }
    setEstado(inicial);
    setBusca('');
  }, [open, brindes]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let lista = brindes;
    if (q) {
      lista = lista.filter(
        (b) =>
          (b.nome || '').toLowerCase().includes(q) ||
          (b.codigo || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [brindes, busca]);

  const toggleBrinde = (id) => {
    setEstado((s) => ({
      ...s,
      [id]: { ...s[id], selecionado: !s[id]?.selecionado },
    }));
  };

  const setQtd = (id, v) => {
    const n = Math.max(1, Number(v) || 1);
    setEstado((s) => ({ ...s, [id]: { ...s[id], qtd: n } }));
  };

  const selecionarTodos = () => {
    setEstado((s) => {
      const novo = { ...s };
      for (const b of filtrados) {
        novo[b.id] = { ...novo[b.id], selecionado: true };
      }
      return novo;
    });
  };

  const desselecionarTodos = () => {
    setEstado((s) => {
      const novo = { ...s };
      for (const b of filtrados) {
        novo[b.id] = { ...novo[b.id], selecionado: false };
      }
      return novo;
    });
  };

  const usarEstoqueTodos = () => {
    setEstado((s) => {
      const novo = { ...s };
      for (const b of filtrados) {
        novo[b.id] = {
          ...novo[b.id],
          qtd: Math.max(1, Number(b.quantidade_estoque) || 1),
        };
      }
      return novo;
    });
  };

  // Resumo
  const selecionados = brindes.filter((b) => estado[b.id]?.selecionado);
  const totalEtiquetas = selecionados.reduce(
    (s, b) => s + Math.max(1, Number(estado[b.id]?.qtd) || 1),
    0
  );
  const totalFiltradosSelecionados = filtrados.filter((b) => estado[b.id]?.selecionado).length;
  const todosFiltradosSelecionados = filtrados.length > 0 && totalFiltradosSelecionados === filtrados.length;

  const imprimir = () => {
    const itens = selecionados.map((b) => ({
      nome: b.nome,
      codigo: b.codigo || '',
      quantidade: Math.max(1, Number(estado[b.id]?.qtd) || 1),
    }));
    imprimirEtiquetas(itens);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Imprimir etiquetas em massa"
      footer={
        <>
          <div className="w-full sm:w-auto sm:mr-auto text-xs text-slate-600">
            <span className="font-semibold">{selecionados.length}</span> {selecionados.length === 1 ? 'produto' : 'produtos'} ·{' '}
            <span className="font-semibold text-sky-700">{totalEtiquetas}</span> {totalEtiquetas === 1 ? 'etiqueta' : 'etiquetas'}
          </div>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={imprimir}
            disabled={selecionados.length === 0}
          >
            <Printer size={14}/> Imprimir
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Busca + ações */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Filtrar por nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap text-xs">
            <button
              type="button"
              className="btn-outline text-xs px-2 py-1"
              onClick={todosFiltradosSelecionados ? desselecionarTodos : selecionarTodos}
            >
              {todosFiltradosSelecionados
                ? <><Square size={12}/> Desmarcar todos</>
                : <><CheckSquare size={12}/> Selecionar todos</>}
            </button>
            <button
              type="button"
              className="btn-outline text-xs px-2 py-1"
              onClick={usarEstoqueTodos}
              title="Define a quantidade de etiquetas igual ao estoque atual"
            >
              Usar estoque como qtd
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="border border-slate-200 rounded-lg max-h-[50vh] overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">Nenhum brinde.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtrados.map((b) => {
                const sel = !!estado[b.id]?.selecionado;
                const qtd = Number(estado[b.id]?.qtd ?? 1);
                return (
                  <li key={b.id} className={`p-2 flex items-center gap-2 ${sel ? 'bg-sky-50' : ''}`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-sky-600"
                      checked={sel}
                      onChange={() => toggleBrinde(b.id)}
                    />
                    {b.foto ? (
                      <img src={b.foto} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                        <Package2 size={16} />
                      </div>
                    )}
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => toggleBrinde(b.id)}
                    >
                      <div className="text-sm font-medium text-slate-800 truncate">{b.nome}</div>
                      <div className="text-[11px] text-slate-500">
                        {b.codigo || 'sem código'} · estoque {b.quantidade_estoque}
                      </div>
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      className="input w-16 text-center text-sm py-1 flex-shrink-0"
                      value={qtd}
                      disabled={!sel}
                      onChange={(e) => setQtd(b.id, e.target.value)}
                      title="Quantidade de etiquetas"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          Etiquetas 95×10mm · padding 3mm esquerdo / 2,5mm direito · Nome + código por etiqueta.
          A impressora térmica avança 3mm entre etiquetas pelo próprio rolo.
        </p>
      </div>
    </Modal>
  );
}
