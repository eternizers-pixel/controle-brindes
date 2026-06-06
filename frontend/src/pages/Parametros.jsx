// Página de Parâmetros de gravação
// Layout split: lista de brindes à esquerda, foto + editor à direita (foto sticky).
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Package2, Settings2, Plus, X, Save, ArrowLeft, Check,
} from 'lucide-react';
import { getBrindes, atualizarBrinde } from '../api/client';
import { useToast } from '../components/Toast';

const PARAM_VAZIO = () => ({
  tipo: 'laser',
  angulo: '',
  hachura: '',
  velocidade: '',
  potencia: '',
  repeticoes: '',
});

export default function Parametros() {
  const toast = useToast();
  const [brindes, setBrindes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [params, setParams] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBrindes({ status: 'ativo' });
      setBrindes(data);
    } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const brindesFiltrados = useMemo(() => {
    const s = busca.trim().toLowerCase();
    if (!s) return brindes;
    return brindes.filter((b) =>
      (b.nome || '').toLowerCase().includes(s) ||
      (b.codigo || '').toLowerCase().includes(s)
    );
  }, [brindes, busca]);

  // Quando seleciona um brinde, carrega seus parâmetros pro estado local
  const selecionar = (b) => {
    if (dirty) {
      if (!window.confirm('Você tem alterações não salvas. Trocar de brinde mesmo assim?')) return;
    }
    setSelecionado(b);
    setParams(Array.isArray(b.parametros_gravacao) ? [...b.parametros_gravacao] : []);
    setDirty(false);
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
      await atualizarBrinde(selecionado.id, { parametros_gravacao: params });
      toast.success(`Parâmetros de "${selecionado.nome}" salvos!`);
      setDirty(false);
      // Atualiza a versão local do brinde sem trocar o foco
      setBrindes((lista) =>
        lista.map((b) => b.id === selecionado.id ? { ...b, parametros_gravacao: params } : b)
      );
      setSelecionado((s) => ({ ...s, parametros_gravacao: params }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white grid place-items-center">
            <Settings2 size={20}/>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Parâmetros de gravação</h1>
            <p className="text-slate-500 text-sm">Configure laser/CO2, ângulo, hachura, velocidade, potência e repetições por brinde</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Lista de brindes (esquerda) */}
        <div className={`md:col-span-4 lg:col-span-4 ${selecionado ? 'hidden md:block' : ''}`}>
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

            {loading ? (
              <div className="text-slate-500 text-sm py-4">Carregando…</div>
            ) : brindesFiltrados.length === 0 ? (
              <div className="text-slate-500 text-sm py-4 text-center">Nenhum brinde encontrado.</div>
            ) : (
              <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {brindesFiltrados.map((b) => {
                  const ativo = selecionado?.id === b.id;
                  const temParams = Array.isArray(b.parametros_gravacao) && b.parametros_gravacao.length > 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selecionar(b)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors border ${
                        ativo
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded bg-slate-100 flex-shrink-0 overflow-hidden grid place-items-center">
                        {b.foto ? (
                          <img src={b.foto} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <Package2 size={20} className="text-slate-300"/>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{b.nome}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          {b.codigo && <span className="truncate">{b.codigo}</span>}
                          {temParams && (
                            <span className="badge bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0">
                              <Check size={9} className="mr-0.5"/>
                              {b.parametros_gravacao.length} param
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
        <div className={`md:col-span-8 lg:col-span-8 ${!selecionado ? 'hidden md:block' : ''}`}>
          {!selecionado ? (
            <div className="card p-10 text-center text-slate-500">
              <Settings2 size={36} className="mx-auto mb-3 text-slate-300"/>
              <div className="font-medium text-slate-700 mb-1">Selecione um brinde</div>
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
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden grid place-items-center">
                    {selecionado.foto ? (
                      <img src={selecionado.foto} alt="" className="w-full h-full object-cover"/>
                    ) : (
                      <Package2 size={48} className="text-slate-300"/>
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
                  {/* Datalists compartilhados: sugestões com possibilidade de digitar livre */}
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
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-semibold uppercase text-slate-600">
                            Parâmetro {idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParam(idx)}
                          className="text-rose-600 hover:bg-rose-50 rounded-full p-1"
                          title="Remover este parâmetro"
                        >
                          <X size={16}/>
                        </button>
                      </div>

                      {/* Linha 1: TIPO sozinho */}
                      <div className="w-[140px]">
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
    </div>
  );
}
