// Página de Parâmetros de gravação
// Mostra tanto BRINDES (com seus parâmetros) quanto PRODUTOS_GRAVACAO
// (itens que não são brindes mas tem parâmetros salvos).
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Package2, Settings2, Plus, X, Save, ArrowLeft, Check, Wrench, Edit2,
  Camera, Image as ImageIcon,
} from 'lucide-react';
import {
  getBrindes, atualizarBrinde,
  getProdutosGravacao, atualizarProdutoGravacao,
} from '../api/client';
import { useToast } from '../components/Toast';
import ProdutoGravacaoModal from '../components/ProdutoGravacaoModal';
import { compressImageFile, compressImageDataURL, dataUrlBytes } from '../utils/imagem';

const FOTO_GRANDE_THRESHOLD = 400 * 1024; // 400KB

const PARAM_VAZIO = () => ({
  titulo: '',
  tipo: 'laser',
  angulo: '',
  hachura: '',
  velocidade: '',
  potencia: '',
  repeticoes: '',
  observacao: '',
  foto: null,
});

export default function Parametros() {
  const toast = useToast();
  const [itens, setItens] = useState([]); // brindes + produtos_gravacao mesclados
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'brinde' | 'gravacao'
  const [selecionado, setSelecionado] = useState(null);
  const [params, setParams] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalProduto, setModalProduto] = useState(null); // null | 'novo' | <produto_obj>

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
    if (dirty) {
      if (!window.confirm('Você tem alterações não salvas. Trocar de item mesmo assim?')) return;
    }
    setSelecionado(b);
    const iniciais = Array.isArray(b.parametros_gravacao) ? [...b.parametros_gravacao] : [];
    setParams(iniciais);
    setDirty(false);

    // Auto-otimização: se algum parâmetro tem foto grande salva no banco,
    // comprime em background e salva a versão menor.
    // Evita que o próximo save normal estoure o statement_timeout do Supabase.
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
      // Atualiza estado local sem marcar dirty (foi automático)
      setParams(otimizados);
      setItens((lista) =>
        lista.map((x) => (x.id === b.id && x._tipo === b._tipo)
          ? { ...x, parametros_gravacao: otimizados }
          : x)
      );
      setSelecionado((s) => ({ ...s, parametros_gravacao: otimizados }));
      toast.success('Fotos antigas otimizadas pra carregar mais rápido.');
    } catch (e) {
      // Falha silenciosa — o usuário pode tentar salvar manualmente
      console.warn('Falha ao otimizar fotos antigas:', e);
    }
  };

  const setParam = (idx, campo, valor) => {
    const arr = [...params];
    arr[idx] = { ...arr[idx], [campo]: valor };
    setParams(arr);
    setDirty(true);
  };
  const addParam = () => {
    setParams([...params, PARAM_VAZIO()]);
    setDirty(true);
  };
  const removeParam = (idx) => {
    const arr = [...params];
    arr.splice(idx, 1);
    setParams(arr);
    setDirty(true);
  };

  const salvar = async () => {
    if (!selecionado) return;
    setSalvando(true);
    try {
      const fn = selecionado._tipo === 'gravacao' ? atualizarProdutoGravacao : atualizarBrinde;
      await fn(selecionado.id, { parametros_gravacao: params });
      toast.success(`Parâmetros de "${selecionado.nome}" salvos!`);
      setDirty(false);
      // Atualiza a versão local
      setItens((lista) =>
        lista.map((b) => (b.id === selecionado.id && b._tipo === selecionado._tipo)
          ? { ...b, parametros_gravacao: params }
          : b)
      );
      setSelecionado((s) => ({ ...s, parametros_gravacao: params }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  // Quando o modal salva um novo produto_gravacao
  const aoSalvarProduto = (produto) => {
    if (!produto) { load({ silent: true }); return; }
    setItens((lista) => {
      const semEle = lista.filter((b) => !(b.id === produto.id && b._tipo === 'gravacao'));
      const novo = { ...produto, _tipo: 'gravacao' };
      return [...semEle, novo].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    });
    // Se acabou de criar ou editar o item selecionado, atualiza foco
    const novoItem = { ...produto, _tipo: 'gravacao' };
    setSelecionado(novoItem);
    setParams(Array.isArray(produto.parametros_gravacao) ? [...produto.parametros_gravacao] : []);
    setDirty(false);
  };

  const aoExcluirProduto = (id) => {
    setItens((lista) => lista.filter((b) => !(b.id === id && b._tipo === 'gravacao')));
    if (selecionado?.id === id && selecionado?._tipo === 'gravacao') {
      setSelecionado(null);
      setParams([]);
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
            <p className="text-slate-500 text-sm">Brindes + produtos externos (só pra gravação)</p>
          </div>
        </div>
        <button
          className="btn-primary text-sm flex-shrink-0"
          onClick={() => setModalProduto('novo')}
        >
          <Plus size={14}/> Novo produto de gravação
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Lista de itens (esquerda) */}
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

            {/* Filtro por tipo */}
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
                      <div className={`w-10 h-10 rounded flex-shrink-0 overflow-hidden grid place-items-center relative ${
                        isExterno ? 'bg-amber-50' : 'bg-slate-100'
                      }`}>
                        {b.foto ? (
                          <img src={b.foto} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <Package2 size={20} className={isExterno ? 'text-amber-300' : 'text-slate-300'}/>
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

        {/* Painel de detalhes + editor (direita) */}
        <div className={`md:col-span-7 lg:col-span-7 ${!selecionado ? 'hidden md:block' : ''}`}>
          {!selecionado ? (
            <div className="card p-10 text-center text-slate-500">
              <Settings2 size={36} className="mx-auto mb-3 text-slate-300"/>
              <div className="font-medium text-slate-700 mb-1">Selecione um item</div>
              <div className="text-xs">Use a lista à esquerda para ver e editar os parâmetros de gravação.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header sticky: foto + nome (sempre visível) */}
              <div className="sticky top-4 z-10 bg-slate-50 pt-1 pb-2">
                <div className="card p-3 flex items-start gap-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSelecionado(null)}
                    className="md:hidden btn-ghost p-1 flex-shrink-0"
                    title="Voltar para a lista"
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
                    {dirty && (
                      <div className="text-[11px] text-amber-700 mt-1 italic">• Alterações não salvas</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      className="btn-primary text-xs px-3 py-1.5"
                      onClick={salvar}
                      disabled={!dirty || salvando}
                    >
                      <Save size={12}/> {salvando ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs px-3 py-1.5"
                      onClick={addParam}
                    >
                      <Plus size={12}/> Adicionar
                    </button>
                    {selecionado._tipo === 'gravacao' && (
                      <button
                        type="button"
                        className="btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 text-xs px-3 py-1.5"
                        onClick={() => setModalProduto(selecionado)}
                        title="Editar nome/foto/código do produto"
                      >
                        <Edit2 size={12}/> Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de parâmetros (editável) */}
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
                    <div key={idx} className="card p-3 sm:p-4 space-y-2 border-l-4 border-l-indigo-400">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-semibold uppercase text-slate-600 truncate">
                            {p.titulo?.trim() ? p.titulo : `Parâmetro ${idx + 1}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParam(idx)}
                          className="text-rose-600 hover:bg-rose-50 rounded-full p-1 flex-shrink-0"
                          title="Remover este parâmetro"
                        >
                          <X size={16}/>
                        </button>
                      </div>

                      {/* Linha 1: TÍTULO | TIPO */}
                      <div className="grid grid-cols-2 gap-2 max-w-[300px]">
                        <div>
                          <label className="label">Título</label>
                          <input
                            className="input"
                            value={p.titulo || ''}
                            onChange={(e) => setParam(idx, 'titulo', e.target.value)}
                            placeholder="Logo grande, tampa…"
                          />
                        </div>
                        <div>
                          <label className="label">Tipo</label>
                          <select
                            className="input"
                            value={p.tipo || 'laser'}
                            onChange={(e) => setParam(idx, 'tipo', e.target.value)}
                          >
                            <option value="laser">Laser</option>
                            <option value="CO2">CO2</option>
                          </select>
                        </div>
                      </div>

                      {/* Linha 2: ANGULO | HACHURA */}
                      <div className="grid grid-cols-2 gap-2 max-w-[300px]">
                        <div>
                          <label className="label">Ângulo</label>
                          <input
                            list="parametros-angulos"
                            className="input"
                            value={p.angulo || ''}
                            onChange={(e) => setParam(idx, 'angulo', e.target.value)}
                            placeholder="0°, 45°…"
                          />
                        </div>
                        <div>
                          <label className="label">Hachura</label>
                          <input
                            list="parametros-hachuras"
                            className="input"
                            value={p.hachura || ''}
                            onChange={(e) => setParam(idx, 'hachura', e.target.value)}
                            placeholder="0.02, 0.04…"
                          />
                        </div>
                      </div>

                      {/* Linha 3: VELOCIDADE | POTÊNCIA | REPETIÇÕES */}
                      <div className="grid grid-cols-3 gap-2 max-w-[450px]">
                        <div>
                          <label className="label">Velocidade</label>
                          <input
                            className="input"
                            value={p.velocidade || ''}
                            onChange={(e) => setParam(idx, 'velocidade', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Potência</label>
                          <input
                            className="input"
                            value={p.potencia || ''}
                            onChange={(e) => setParam(idx, 'potencia', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Repetições</label>
                          <input
                            className="input"
                            value={p.repeticoes || ''}
                            onChange={(e) => setParam(idx, 'repeticoes', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Linha 4: OBSERVAÇÕES (largura completa pra texto longo) */}
                      <div>
                        <label className="label">Observações</label>
                        <textarea
                          className="input"
                          rows={2}
                          value={p.observacao || ''}
                          onChange={(e) => setParam(idx, 'observacao', e.target.value)}
                          placeholder="Tamanho da gravação, qual logo, posição, detalhes…"
                        />
                      </div>

                      {/* Linha 5: FOTO DA GRAVAÇÃO */}
                      <div>
                        <label className="label">Foto da gravação</label>
                        <div className="flex items-start gap-2">
                          {p.foto ? (
                            <div className="relative group flex-shrink-0">
                              <a href={p.foto} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                                <img
                                  src={p.foto}
                                  alt=""
                                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg object-cover border border-slate-200 hover:border-indigo-400 transition-colors"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={() => setParam(idx, 'foto', null)}
                                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700"
                                title="Remover foto"
                              >
                                <X size={12}/>
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer w-28 h-28 sm:w-32 sm:h-32 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors grid place-items-center text-slate-400 hover:text-indigo-600 flex-shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <Camera size={22}/>
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
                                    setParam(idx, 'foto', dataUrl);
                                  } catch (err) {
                                    toast.error(err.message || 'Erro ao processar a imagem.');
                                  } finally {
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                          )}
                          <div className="text-[11px] text-slate-500 pt-1">
                            {p.foto ? (
                              <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 underline">
                                Trocar foto
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onload = () => setParam(idx, 'foto', reader.result);
                                    reader.readAsDataURL(f);
                                  }}
                                />
                              </label>
                            ) : (
                              <span className="italic">Mostra o produto gravado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Botão Salvar grande no rodapé */}
                  <div className="card p-3 flex items-center justify-between bg-slate-50">
                    <div className="text-xs text-slate-600">
                      {dirty ? (
                        <span className="text-amber-700 font-medium">• Alterações não salvas</span>
                      ) : (
                        <span className="text-emerald-700">Todos os parâmetros estão salvos</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={salvar}
                      disabled={!dirty || salvando}
                    >
                      <Save size={14}/> {salvando ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de novo/editar produto de gravação */}
      <ProdutoGravacaoModal
        open={!!modalProduto}
        produto={modalProduto === 'novo' ? null : modalProduto}
        onClose={() => setModalProduto(null)}
        onSaved={aoSalvarProduto}
        onDeleted={aoExcluirProduto}
      />
    </div>
  );
}
