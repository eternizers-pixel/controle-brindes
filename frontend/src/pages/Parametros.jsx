// Página de Parâmetros de gravação.
// Cada "parâmetro" representa uma PEÇA (Logo frente, tampa, etc.) e tem:
//   - título (opcional)
//   - foto da peça gravada (opcional)
//   - observações (opcional)
//   - PASSOS: cada passo é uma configuração de máquina (Laser/CO2, ângulo, etc.)
//     A mesma peça pode ter vários passos (ex: 1ª passagem + 2ª passagem).
//
// Cada card tem dois modos:
//   - Visualização (compacto, tabela lado-a-lado dos passos)
//   - Edição (formulário com os campos)
// Clicar em Salvar (global) persiste e colapsa todos pra visualização.
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Package2, Settings2, Plus, X, ArrowLeft, Check, Wrench, Edit2,
  Camera, Copy, Loader2, CloudOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import PassoAPassoView from '../components/PassoAPassoView';
import {
  getBrindes, atualizarBrinde,
  getProdutosGravacao, atualizarProdutoGravacao,
} from '../api/client';
import { useToast } from '../components/Toast';
import ProdutoGravacaoModal from '../components/ProdutoGravacaoModal';
import { compressImageFile, compressImageDataURL, dataUrlBytes } from '../utils/imagem';

const FOTO_GRANDE_THRESHOLD = 400 * 1024; // 400KB

const PASSO_VAZIO = () => ({
  tipo: 'laser',
  angulo: '',
  hachura: '',
  velocidade: '',
  potencia: '',
  repeticoes: '',
});

const PARAM_VAZIO = () => ({
  titulo: '',
  observacao: '',
  foto: null,
  passos: [PASSO_VAZIO()],
});

// Compatibilidade com a estrutura antiga (sem `passos`, fields flat).
function normalizarParam(p) {
  if (!p || typeof p !== 'object') return PARAM_VAZIO();
  if (Array.isArray(p.passos)) {
    // Já no formato novo
    return {
      titulo: p.titulo || '',
      observacao: p.observacao || '',
      foto: p.foto || null,
      passos: p.passos.length > 0 ? p.passos.map((pa) => ({
        tipo: pa.tipo || 'laser',
        angulo: pa.angulo || '',
        hachura: pa.hachura || '',
        velocidade: pa.velocidade || '',
        potencia: pa.potencia || '',
        repeticoes: pa.repeticoes || '',
      })) : [PASSO_VAZIO()],
    };
  }
  // Formato antigo: campos flat → vira 1 passo
  return {
    titulo: p.titulo || '',
    observacao: p.observacao || '',
    foto: p.foto || null,
    passos: [{
      tipo: p.tipo || 'laser',
      angulo: p.angulo || '',
      hachura: p.hachura || '',
      velocidade: p.velocidade || '',
      potencia: p.potencia || '',
      repeticoes: p.repeticoes || '',
    }],
  };
}

function normalizarLista(lista) {
  return Array.isArray(lista) ? lista.map(normalizarParam) : [];
}

export default function Parametros() {


  const toast = useToast();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [selecionado, setSelecionado] = useState(null);
  const [params, setParams] = useState([]);
  const [editingSet, setEditingSet] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  // Status do auto-save: 'idle' | 'salvando' | 'salvo' | 'erro'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [modalProduto, setModalProduto] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [copiarOpen, setCopiarOpen] = useState(false);

  // Auto-save com debounce de 1s a cada alteração
  useEffect(() => {
    if (!dirty || !selecionado) return;
    let cancelado = false;
    const timer = setTimeout(async () => {
      setSaveStatus('salvando');
      try {
        const fn = selecionado._tipo === 'gravacao' ? atualizarProdutoGravacao : atualizarBrinde;
        await fn(selecionado.id, { parametros_gravacao: params });
        if (cancelado) return;
        setItens((lista) =>
          lista.map((b) => (b.id === selecionado.id && b._tipo === selecionado._tipo)
            ? { ...b, parametros_gravacao: params }
            : b)
        );
        setSelecionado((s) => s ? { ...s, parametros_gravacao: params } : s);
        setDirty(false);
        setSaveStatus('salvo');
        // Volta pra idle depois de 1.5s
        setTimeout(() => setSaveStatus((s) => s === 'salvo' ? 'idle' : s), 1500);
      } catch (e) {
        if (cancelado) return;
        setSaveStatus('erro');
        toast.error('Erro ao salvar: ' + (e.message || 'desconhecido'));
      }
    }, 1000);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, params, selecionado]);

  // Esc fecha o lightbox
  useEffect(() => {
    if (!fotoAmpliada) return;
    const handler = (e) => { if (e.key === 'Escape') setFotoAmpliada(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fotoAmpliada]);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [brindes, produtos] = await Promise.all([
        getBrindes({ status: 'ativo' }),
        getProdutosGravacao(),
      ]);
      const lista = [
        ...brindes.map((b) => ({ ...b, _tipo: 'brinde' })),
        ...produtos.map((p) => ({ ...p, _tipo: 'gravacao' })),
      ].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
      setItens(lista);
    } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const itensFiltrados = useMemo(() => {
    const s = busca.trim().toLowerCase();
    return itens.filter((b) => {
      if (filtroTipo === 'brinde' && b._tipo !== 'brinde') return false;
      if (filtroTipo === 'gravacao' && b._tipo !== 'gravacao') return false;
      if (!s) return true;
      return (b.nome || '').toLowerCase().includes(s) ||
             (b.codigo || '').toLowerCase().includes(s);
    });
  }, [itens, busca, filtroTipo]);

  const selecionar = async (b) => {
    // Se tem alteração pendente no item atual, força salvar antes de trocar
    if (dirty && selecionado) {
      try {
        const fn = selecionado._tipo === 'gravacao' ? atualizarProdutoGravacao : atualizarBrinde;
        await fn(selecionado.id, { parametros_gravacao: params });
        setItens((lista) =>
          lista.map((x) => (x.id === selecionado.id && x._tipo === selecionado._tipo)
            ? { ...x, parametros_gravacao: params }
            : x)
        );
      } catch (e) {
        const continuar = window.confirm(
          `Falha ao salvar alterações em "${selecionado.nome}":\n${e.message}\n\nTrocar de item mesmo assim? As alterações pendentes serão perdidas.`
        );
        if (!continuar) return;
      }
      setDirty(false);
    }
    setSelecionado(b);
    const iniciais = normalizarLista(b.parametros_gravacao);
    setParams(iniciais);
    setEditingSet(new Set());
    setDirty(false);

    // Auto-otimização das fotos grandes salvas
    const temGrande = iniciais.some((p) => p.foto && dataUrlBytes(p.foto) > FOTO_GRANDE_THRESHOLD);
    if (!temGrande) return;
    try {
      const otimizados = await Promise.all(iniciais.map(async (p) => {
        if (p.foto && dataUrlBytes(p.foto) > FOTO_GRANDE_THRESHOLD) {
          try {
            const small = await compressImageDataURL(p.foto);
            return { ...p, foto: small };
          } catch {
            return p;
          }
        }
        return p;
      }));
      const fn = b._tipo === 'gravacao' ? atualizarProdutoGravacao : atualizarBrinde;
      await fn(b.id, { parametros_gravacao: otimizados });
      setParams(otimizados);
      setItens((lista) =>
        lista.map((x) => (x.id === b.id && x._tipo === b._tipo)
          ? { ...x, parametros_gravacao: otimizados }
          : x)
      );
      setSelecionado((s) => ({ ...s, parametros_gravacao: otimizados }));
      toast.success('Fotos antigas otimizadas pra carregar mais rápido.');
    } catch (e) {
      console.warn('Falha ao otimizar fotos antigas:', e);
    }
  };

  // === Operações de parâmetro (card) ===
  const setParamField = (idx, campo, valor) => {
    const arr = [...params];
    arr[idx] = { ...arr[idx], [campo]: valor };
    setParams(arr);
    setDirty(true);
  };
  const addParam = () => {
    const novoIdx = params.length;
    setParams([...params, PARAM_VAZIO()]);
    setDirty(true);
    setEditingSet((s) => new Set([...s, novoIdx]));
  };
  const removeParam = (idx) => {
    if (!window.confirm('Remover este parâmetro inteiro?')) return;
    const arr = [...params];
    arr.splice(idx, 1);
    setParams(arr);
    setDirty(true);
    setEditingSet((s) => {
      const n = new Set();
      s.forEach((i) => {
        if (i < idx) n.add(i);
        else if (i > idx) n.add(i - 1);
      });
      return n;
    });
  };

  // === Operações de passo (dentro de um card) ===
  const setPassoField = (paramIdx, passoIdx, campo, valor) => {
    const arr = [...params];
    const passos = [...arr[paramIdx].passos];
    passos[passoIdx] = { ...passos[passoIdx], [campo]: valor };
    arr[paramIdx] = { ...arr[paramIdx], passos };
    setParams(arr);
    setDirty(true);
  };
  const addPasso = (paramIdx) => {
    const arr = [...params];
    arr[paramIdx] = { ...arr[paramIdx], passos: [...arr[paramIdx].passos, PASSO_VAZIO()] };
    setParams(arr);
    setDirty(true);
  };
  const removePasso = (paramIdx, passoIdx) => {
    const arr = [...params];
    const passos = [...arr[paramIdx].passos];
    passos.splice(passoIdx, 1);
    arr[paramIdx] = { ...arr[paramIdx], passos: passos.length ? passos : [PASSO_VAZIO()] };
    setParams(arr);
    setDirty(true);
  };

  // === Edit/View toggle ===
  const toggleEdit = (idx) => {
    setEditingSet((s) => {
      const n = new Set(s);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });
  };
  const isEditing = (idx) => editingSet.has(idx);

  // Copia os parâmetros de outro item pro selecionado.
  // modo: 'substituir' (descarta os atuais) ou 'adicionar' (concatena no final).
  const aplicarCopia = (srcItem, modo) => {
    const srcParams = normalizarLista(srcItem.parametros_gravacao);
    // Deep clone pra não compartilhar referências
    const clonados = JSON.parse(JSON.stringify(srcParams));
    setParams((atuais) => modo === 'substituir' ? clonados : [...atuais, ...clonados]);
    setDirty(true);
    setEditingSet(new Set()); // tudo em view mode após copiar — usuário vê o resultado
    setCopiarOpen(false);
    toast.success(
      modo === 'substituir'
        ? `${clonados.length} parâmetro(s) copiados de "${srcItem.nome}".`
        : `${clonados.length} parâmetro(s) adicionados de "${srcItem.nome}".`
    );
  };


  const aoSalvarProduto = (produto) => {
    if (!produto) { load({ silent: true }); return; }
    setItens((lista) => {
      const semEle = lista.filter((b) => !(b.id === produto.id && b._tipo === 'gravacao'));
      const novo = { ...produto, _tipo: 'gravacao' };
      return [...semEle, novo].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    });
    const novoItem = { ...produto, _tipo: 'gravacao' };
    setSelecionado(novoItem);
    setParams(normalizarLista(produto.parametros_gravacao));
    setEditingSet(new Set());
    setDirty(false);
  };

  const aoExcluirProduto = (id) => {
    setItens((lista) => lista.filter((b) => !(b.id === id && b._tipo === 'gravacao')));
    if (selecionado?.id === id && selecionado?._tipo === 'gravacao') {
      setSelecionado(null);
      setParams([]);
      setEditingSet(new Set());
      setDirty(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white grid place-items-center">
            <Settings2 size={20}/>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Parâmetros de gravação</h1>
            <p className="text-slate-500 text-sm">Brindes, produtos externos e passo a passo do processo</p>
          </div>
        </div>
        <button
          className="btn-primary text-sm flex-shrink-0"
          onClick={() => setModalProduto('novo')}
        >
          <Plus size={14}/> Novo produto de gravação
        </button>
      </header>

      {/* Toggle Produtos | Passo a Passo (Passo a Passo navega pra rota propria) */}
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-slate-800">
          Produtos
        </button>
        <Link
          to="/passo-a-passo"
          className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-800 transition-all"
        >
          Passo a Passo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Lista (esquerda) */}
        <div className={`md:col-span-5 lg:col-span-5 ${selecionado ? 'hidden md:block' : ''}`}>
          <div className="card p-3 sticky top-4">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input
                className="input pl-9"
                placeholder="Buscar por nome ou código…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="flex gap-1 mb-2 text-xs">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'brinde', label: 'Brindes' },
                { key: 'gravacao', label: 'Externos' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFiltroTipo(opt.key)}
                  className={`flex-1 px-2 py-1 rounded-md transition-colors ${
                    filtroTipo === opt.key
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-slate-500 text-sm py-4">Carregando…</div>
            ) : itensFiltrados.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">Nenhum item encontrado.</div>
            ) : (
              <div className="space-y-1 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {itensFiltrados.map((b) => {
                  const ativo = selecionado?.id === b.id && selecionado?._tipo === b._tipo;
                  const temParams = Array.isArray(b.parametros_gravacao) && b.parametros_gravacao.length > 0;
                  const isExterno = b._tipo === 'gravacao';
                  return (
                    <button
                      key={`${b._tipo}-${b.id}`}
                      type="button"
                      onClick={() => selecionar(b)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors border ${
                        ativo
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-16 h-16 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 overflow-hidden grid place-items-center relative ${
                        isExterno ? 'bg-amber-50' : 'bg-slate-100'
                      }`}>
                        {b.foto ? (
                          <img src={b.foto} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <Package2 size={28} className={isExterno ? 'text-amber-300' : 'text-slate-300'}/>
                        )}
                        {isExterno && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white grid place-items-center" title="Produto externo">
                            <Wrench size={9}/>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{b.nome}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                          {b.codigo && <span className="truncate">{b.codigo}</span>}
                          {temParams && (
                            <span className="badge bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                              <Check size={10} className="mr-0.5"/>
                              {b.parametros_gravacao.length} {b.parametros_gravacao.length === 1 ? 'parâmetro' : 'parâmetros'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel direito */}
        <div className={`md:col-span-7 lg:col-span-7 ${!selecionado ? 'hidden md:block' : ''}`}>
          {!selecionado ? (
            <div className="card p-10 text-center text-slate-500">
              <Settings2 size={36} className="mx-auto mb-3 text-slate-300"/>
              <div className="font-medium text-slate-700 mb-1">Selecione um item</div>
              <div className="text-xs">Use a lista à esquerda para ver e editar os parâmetros de gravação.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header sticky */}
              <div className="sticky top-4 z-10 bg-slate-50 pt-1 pb-2">
                <div className="card p-3 flex items-start gap-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSelecionado(null)}
                    className="md:hidden btn-ghost p-1 flex-shrink-0"
                    title="Voltar"
                  >
                    <ArrowLeft size={18}/>
                  </button>
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden grid place-items-center relative">
                    {selecionado.foto ? (
                      <img src={selecionado.foto} alt="" className="w-full h-full object-cover"/>
                    ) : (
                      <Package2 size={48} className="text-slate-300"/>
                    )}
                    {selecionado._tipo === 'gravacao' && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Wrench size={9}/> Externo
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-base sm:text-lg leading-tight">{selecionado.nome}</div>
                    {selecionado.codigo && (
                      <div className="text-xs text-slate-500 mt-0.5">cód. {selecionado.codigo}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1.5">
                      {params.length === 0
                        ? 'Nenhum parâmetro configurado ainda'
                        : `${params.length} parâmetro${params.length > 1 ? 's' : ''} configurado${params.length > 1 ? 's' : ''}`}
                    </div>
                    <StatusSalvamento dirty={dirty} status={saveStatus} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      className="btn-outline border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs px-3 py-1.5"
                      onClick={addParam}
                    >
                      <Plus size={12}/> Adicionar
                    </button>
                    <button
                      type="button"
                      className="btn-outline border-sky-300 text-sky-700 hover:bg-sky-50 text-xs px-3 py-1.5"
                      onClick={() => setCopiarOpen(true)}
                      title="Copiar parâmetros de outro produto"
                    >
                      <Copy size={12}/> Copiar de…
                    </button>
                    {selecionado._tipo === 'gravacao' && (
                      <button
                        type="button"
                        className="btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 text-xs px-3 py-1.5"
                        onClick={() => setModalProduto(selecionado)}
                      >
                        <Edit2 size={12}/> Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de cards (parâmetros) */}
              {params.length === 0 ? (
                <div className="card p-10 text-center text-slate-500">
                  <Settings2 size={32} className="mx-auto mb-2 text-slate-300"/>
                  <div className="text-sm">Nenhum parâmetro configurado.</div>
                  <button
                    type="button"
                    onClick={addParam}
                    className="btn-outline border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs mt-3"
                  >
                    <Plus size={12}/> Adicionar primeiro parâmetro
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <datalist id="parametros-angulos">
                    <option value="0°" />
                    <option value="45°" />
                    <option value="80°" />
                    <option value="90°" />
                  </datalist>
                  <datalist id="parametros-hachuras">
                    <option value="0.02" />
                    <option value="0.04" />
                    <option value="0.06" />
                  </datalist>

                  {params.map((p, idx) => (
                    <ParametroCard
                      key={idx}
                      idx={idx}
                      param={p}
                      editing={isEditing(idx)}
                      onToggleEdit={() => toggleEdit(idx)}
                      onSetField={(campo, valor) => setParamField(idx, campo, valor)}
                      onRemove={() => removeParam(idx)}
                      onSetPasso={(pIdx, campo, valor) => setPassoField(idx, pIdx, campo, valor)}
                      onAddPasso={() => addPasso(idx)}
                      onRemovePasso={(pIdx) => removePasso(idx, pIdx)}
                      onZoom={(src) => setFotoAmpliada(src)}
                    />
                  ))}

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ProdutoGravacaoModal
        open={!!modalProduto}
        produto={modalProduto === 'novo' ? null : modalProduto}
        onClose={() => setModalProduto(null)}
        onSaved={aoSalvarProduto}
        onDeleted={aoExcluirProduto}
      />

      <Lightbox src={fotoAmpliada} onClose={() => setFotoAmpliada(null)} />

      <CopiarParametrosModal
        open={copiarOpen}
        itens={itens}
        atual={selecionado}
        temParamsAtuais={params.length > 0}
        onClose={() => setCopiarOpen(false)}
        onCopiar={aplicarCopia}
      />
    </div>
  );
}

// Modal pra escolher um produto fonte e copiar os parâmetros dele pro selecionado.
function CopiarParametrosModal({ open, itens, atual, temParamsAtuais, onClose, onCopiar }) {
  const [busca, setBusca] = useState('');
  const [candidato, setCandidato] = useState(null);

  useEffect(() => {
    if (!open) { setBusca(''); setCandidato(null); }
  }, [open]);

  // Só mostra itens que TEM parâmetros configurados, exceto o próprio atual
  const candidatos = useMemo(() => {
    const s = busca.trim().toLowerCase();
    return itens.filter((b) => {
      if (atual && b.id === atual.id && b._tipo === atual._tipo) return false;
      const temParams = Array.isArray(b.parametros_gravacao) && b.parametros_gravacao.length > 0;
      if (!temParams) return false;
      if (!s) return true;
      return (b.nome || '').toLowerCase().includes(s) ||
             (b.codigo || '').toLowerCase().includes(s);
    });
  }, [itens, atual, busca]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Copiar parâmetros de outro produto"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </>
      }
    >
      <div className="space-y-3">
        {!candidato ? (
          <>
            <p className="text-xs text-slate-500">
              Escolha o produto cujos parâmetros você quer copiar.
              Só aparecem aqui itens que já tem parâmetros configurados.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input
                className="input pl-9"
                placeholder="Buscar por nome ou código…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
            </div>

            {candidatos.length === 0 ? (
              <div className="text-slate-500 text-sm py-6 text-center">
                {busca ? 'Nenhum produto encontrado com esses termos.' : 'Nenhum produto disponível pra copiar ainda.'}
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {candidatos.map((b) => {
                  const n = b.parametros_gravacao.length;
                  const isExterno = b._tipo === 'gravacao';
                  return (
                    <button
                      key={`${b._tipo}-${b.id}`}
                      type="button"
                      onClick={() => setCandidato(b)}
                      className="w-full text-left p-2 rounded-lg flex items-center gap-2 bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded flex-shrink-0 overflow-hidden grid place-items-center ${
                        isExterno ? 'bg-amber-50' : 'bg-slate-100'
                      }`}>
                        {b.foto ? (
                          <img src={b.foto} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <Package2 size={20} className={isExterno ? 'text-amber-300' : 'text-slate-300'}/>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{b.nome}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          {b.codigo && <span className="truncate">{b.codigo}</span>}
                          <span className="badge bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0">
                            {n} {n === 1 ? 'parâmetro' : 'parâmetros'}
                          </span>
                        </div>
                      </div>
                      <Copy size={14} className="text-sky-500 flex-shrink-0"/>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // Confirmação: candidato selecionado, escolher modo
          <div className="space-y-3">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0 grid place-items-center">
                {candidato.foto ? (
                  <img src={candidato.foto} alt="" className="w-full h-full object-cover"/>
                ) : (
                  <Package2 size={22} className="text-slate-300"/>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{candidato.nome}</div>
                {candidato.codigo && (
                  <div className="text-[11px] text-slate-500">cód. {candidato.codigo}</div>
                )}
                <div className="text-[11px] text-sky-700 mt-0.5">
                  {candidato.parametros_gravacao.length} {candidato.parametros_gravacao.length === 1 ? 'parâmetro' : 'parâmetros'} a copiar
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidato(null)}
                className="text-slate-500 hover:text-slate-800 text-xs underline flex-shrink-0"
              >
                Trocar
              </button>
            </div>

            {temParamsAtuais ? (
              <>
                <p className="text-sm text-slate-700">
                  O produto atual já tem parâmetros configurados. Como você quer copiar?
                </p>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => onCopiar(candidato, 'substituir')}
                    className="btn bg-rose-600 text-white hover:bg-rose-700 text-sm"
                  >
                    <X size={14}/> Substituir tudo
                    <span className="text-[10px] opacity-80 ml-1">(remove os atuais)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopiar(candidato, 'adicionar')}
                    className="btn-primary text-sm"
                  >
                    <Plus size={14}/> Adicionar ao final
                    <span className="text-[10px] opacity-80 ml-1">(mantém os atuais)</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  Confirma que quer copiar os {candidato.parametros_gravacao.length} parâmetro(s) pra cá?
                </p>
                <button
                  type="button"
                  onClick={() => onCopiar(candidato, 'substituir')}
                  className="btn-primary text-sm w-full"
                >
                  <Copy size={14}/> Copiar parâmetros
                </button>
              </>
            )}

            <p className="text-[11px] text-slate-500">
              Salva automaticamente em instantes.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Indicador discreto do status de auto-save.
function StatusSalvamento({ dirty, status }) {
  if (status === 'salvando') {
    return (
      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
        <Loader2 size={10} className="animate-spin"/> Salvando…
      </div>
    );
  }
  if (status === 'salvo') {
    return (
      <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
        <Check size={11}/> Salvo
      </div>
    );
  }
  if (status === 'erro') {
    return (
      <div className="text-[11px] text-rose-700 mt-1 flex items-center gap-1">
        <CloudOff size={11}/> Erro ao salvar — vai tentar de novo
      </div>
    );
  }
  if (dirty) {
    return (
      <div className="text-[11px] text-amber-700 mt-1 italic">
        • Salvando em instantes…
      </div>
    );
  }
  return null;
}

// Lightbox simples: overlay full-screen com a foto centralizada.
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/25 rounded-full p-2 transition-colors"
        title="Fechar (Esc)"
      >
        <X size={24}/>
      </button>
      <img
        src={src}
        alt="Foto ampliada"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ===========================================================================
// Card de um parâmetro (peça). Alterna entre view e edit mode.
// ===========================================================================
function ParametroCard({
  idx, param, editing, onToggleEdit, onSetField, onRemove,
  onSetPasso, onAddPasso, onRemovePasso, onZoom,
}) {
  const titulo = param.titulo?.trim() || `Parâmetro ${idx + 1}`;

  return (
    <div className="card p-3 sm:p-4 space-y-3 border-l-4 border-l-indigo-400">
      {/* Header do card */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-bold flex-shrink-0">
            {idx + 1}
          </div>
          {editing ? (
            <input
              className="input flex-1 max-w-sm text-sm"
              placeholder="Título (ex: LOGO FRENTE) — opcional"
              value={param.titulo || ''}
              onChange={(e) => onSetField('titulo', e.target.value)}
            />
          ) : (
            <span className="font-semibold text-slate-800 truncate">{titulo}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onToggleEdit}
            className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
              editing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title={editing ? 'Recolher (sem salvar — use o botão Salvar lá em cima)' : 'Editar este parâmetro'}
          >
            {editing ? <><Check size={12}/> Pronto</> : <><Edit2 size={12}/> Editar</>}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-rose-600 hover:bg-rose-50 rounded-full p-1"
            title="Remover este parâmetro inteiro"
          >
            <X size={16}/>
          </button>
        </div>
      </div>

      {editing ? (
        <ParametroEditMode
          param={param}
          onSetField={onSetField}
          onSetPasso={onSetPasso}
          onAddPasso={onAddPasso}
          onRemovePasso={onRemovePasso}
          onZoom={onZoom}
        />
      ) : (
        <ParametroViewMode param={param} onZoom={onZoom} />
      )}
    </div>
  );
}

// ===========================================================================
// VIEW MODE — exibição compacta. Múltiplos passos viram colunas lado a lado.
// ===========================================================================
function ParametroViewMode({ param, onZoom }) {
  const passos = param.passos || [];
  const temAlgo = passos.some((p) =>
    p.tipo || p.angulo || p.hachura || p.velocidade || p.potencia || p.repeticoes
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Foto à esquerda */}
      {param.foto && (
        <button
          type="button"
          onClick={() => onZoom?.(param.foto)}
          className="flex-shrink-0 cursor-zoom-in"
          title="Clique para ampliar"
        >
          <img
            src={param.foto}
            alt=""
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-slate-200 hover:border-indigo-400 transition-colors"
          />
        </button>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        {/* Passos lado a lado em tabela */}
        {temAlgo ? (
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-indigo-700 font-semibold border-b border-slate-200">
                  <th className="text-left pb-1 pr-3 font-medium text-slate-500 w-24"></th>
                  {passos.map((_, i) => (
                    <th key={i} className="text-left pb-1 pr-3 font-semibold">Passo {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <LinhaTabela label="Tipo"       passos={passos} campo="tipo"       capitalize />
                <LinhaTabela label="Ângulo"     passos={passos} campo="angulo" />
                <LinhaTabela label="Hachura"    passos={passos} campo="hachura" />
                <LinhaTabela label="Velocidade" passos={passos} campo="velocidade" />
                <LinhaTabela label="Potência"   passos={passos} campo="potencia" />
                <LinhaTabela label="Repetições" passos={passos} campo="repeticoes" />
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">Nenhum passo configurado.</div>
        )}

        {/* Observação */}
        {param.observacao?.trim() && (
          <div className="text-xs text-slate-600 italic flex gap-1.5 items-start pt-1 border-t border-slate-100">
            <span className="text-slate-400 flex-shrink-0">📝</span>
            <span className="whitespace-pre-wrap">{param.observacao}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaTabela({ label, passos, campo, capitalize }) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="text-slate-500 pr-3 py-1 align-top">{label}</td>
      {passos.map((p, i) => {
        const v = p[campo];
        return (
          <td key={i} className="pr-3 py-1 align-top">
            {v ? (
              <span className={capitalize ? 'capitalize font-medium' : 'font-medium'}>{v}</span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ===========================================================================
// EDIT MODE — formulário. Múltiplos passos viram blocos lado a lado.
// ===========================================================================
function ParametroEditMode({ param, onSetField, onSetPasso, onAddPasso, onRemovePasso, onZoom }) {
  return (
    <div className="space-y-3">
      {/* Passos lado a lado */}
      <div className="flex flex-wrap gap-2 items-start">
        {param.passos.map((passo, pIdx) => (
          <div
            key={pIdx}
            className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-2.5 space-y-2 relative min-w-[240px] flex-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold text-indigo-700">
                Passo {pIdx + 1}
              </span>
              {param.passos.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemovePasso(pIdx)}
                  className="text-rose-600 hover:bg-rose-50 rounded-full p-0.5"
                  title="Remover este passo"
                >
                  <X size={12}/>
                </button>
              )}
            </div>

            {/* Tipo */}
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={passo.tipo || 'laser'}
                onChange={(e) => onSetPasso(pIdx, 'tipo', e.target.value)}
              >
                <option value="laser">Laser</option>
                <option value="CO2">CO2</option>
              </select>
            </div>

            {/* Ângulo + Hachura */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Ângulo</label>
                <input
                  list="parametros-angulos"
                  className="input"
                  value={passo.angulo || ''}
                  onChange={(e) => onSetPasso(pIdx, 'angulo', e.target.value)}
                  placeholder="0°, 45°…"
                />
              </div>
              <div>
                <label className="label">Hachura</label>
                <input
                  list="parametros-hachuras"
                  className="input"
                  value={passo.hachura || ''}
                  onChange={(e) => onSetPasso(pIdx, 'hachura', e.target.value)}
                  placeholder="0.02, 0.04…"
                />
              </div>
            </div>

            {/* Velocidade + Potência + Repetições */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Vel.</label>
                <input
                  className="input"
                  value={passo.velocidade || ''}
                  onChange={(e) => onSetPasso(pIdx, 'velocidade', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Pot.</label>
                <input
                  className="input"
                  value={passo.potencia || ''}
                  onChange={(e) => onSetPasso(pIdx, 'potencia', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Rep.</label>
                <input
                  className="input"
                  value={passo.repeticoes || ''}
                  onChange={(e) => onSetPasso(pIdx, 'repeticoes', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Botão + Passo */}
        <button
          type="button"
          onClick={onAddPasso}
          className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-600 rounded-lg p-3 min-w-[80px] flex flex-col items-center justify-center gap-1 text-xs self-stretch transition-colors"
          title="Adicionar mais um passo de gravação"
        >
          <Plus size={16}/>
          <span>Passo</span>
        </button>
      </div>

      {/* Observações */}
      <div>
        <label className="label">Observações</label>
        <textarea
          className="input"
          rows={2}
          value={param.observacao || ''}
          onChange={(e) => onSetField('observacao', e.target.value)}
          placeholder="Tamanho da gravação, qual logo, posição, detalhes…"
        />
      </div>

      {/* Foto */}
      <div>
        <label className="label">Foto da gravação</label>
        <div className="flex items-start gap-2">
          {param.foto ? (
            <div className="relative group flex-shrink-0">
              <button
                type="button"
                onClick={() => onZoom?.(param.foto)}
                className="cursor-zoom-in"
                title="Clique para ampliar"
              >
                <img
                  src={param.foto}
                  alt=""
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover border border-slate-200 hover:border-indigo-400 transition-colors"
                />
              </button>
              <button
                type="button"
                onClick={() => onSetField('foto', null)}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700"
                title="Remover foto"
              >
                <X size={12}/>
              </button>
            </div>
          ) : (
            <FotoUploader onUpload={(d) => onSetField('foto', d)} />
          )}
          {param.foto && (
            <FotoTrocar onUpload={(d) => onSetField('foto', d)} />
          )}
        </div>
      </div>
    </div>
  );
}

function FotoUploader({ onUpload }) {
  return (
    <label className="cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors grid place-items-center text-slate-400 hover:text-indigo-600 flex-shrink-0">
      <div className="flex flex-col items-center gap-1">
        <Camera size={20}/>
        <span className="text-[10px] text-center px-2 leading-tight">Adicionar foto</span>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const dataUrl = await compressImageFile(f);
            onUpload(dataUrl);
          } catch (err) {
            alert(err.message || 'Erro ao processar a imagem.');
          } finally {
            e.target.value = '';
          }
        }}
      />
    </label>
  );
}

function FotoTrocar({ onUpload }) {
  return (
    <label className="cursor-pointer text-[11px] text-indigo-600 hover:text-indigo-800 underline pt-1">
      Trocar foto
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const dataUrl = await compressImageFile(f);
            onUpload(dataUrl);
          } catch (err) {
            alert(err.message || 'Erro ao processar a imagem.');
          } finally {
            e.target.value = '';
          }
        }}
      />
    </label>
  );
}
