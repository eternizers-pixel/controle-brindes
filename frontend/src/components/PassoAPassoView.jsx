// Painel de Passo a Passo de Gravação Laser.
// Vive dentro da aba Parâmetros (toggle no topo).
// Estrutura:
//   - Seções (Setup / Arte / Posicionamento / Altura / Parâmetros / Dúvidas)
//   - Cada seção lista os passos ordenados
//   - Posicionamento e Parâmetros têm sub-abas por tipo de produto
//   - Cada passo tem foto + descrição, editável inline
import { useEffect, useMemo, useState } from 'react';
import {
  Power, Palette, MoveHorizontal, Ruler, Sliders, HelpCircle,
  Plus, Trash2, Edit2, Check, X, Camera, ArrowUp, ArrowDown, ZoomIn,
} from 'lucide-react';
import { getGravacaoPassos, criarGravacaoPasso, atualizarGravacaoPasso, deletarGravacaoPasso } from '../api/client';
import { compressImageFile } from '../utils/imagem';
import { useToast } from './Toast';

// Definição das seções e seus tipos de produto (se aplicável)
const SECOES = [
  { key: 'setup',          titulo: 'Setup Inicial',          descricao: 'Ligar a máquina e abrir o programa',                      icone: Power,           tipos: null },
  { key: 'arte',           titulo: 'Fazer a Arte',           descricao: 'Preparar o desenho no CorelDraw antes de gravar',        icone: Palette,         tipos: null },
  { key: 'posicionamento', titulo: 'Posicionar o Produto',   descricao: 'Como fixar cada tipo de produto na máquina',             icone: MoveHorizontal,  tipos: [
    { key: 'stanley',  label: 'Stanley (copos/garrafas)' },
    { key: 'pulseira', label: 'Pulseira' },
    { key: 'caneta',   label: 'Caneta' },
  ]},
  { key: 'altura',         titulo: 'Ajustar Altura do Laser', descricao: 'Passo mais importante — juntar os 3 pontinhos vermelhos', icone: Ruler,           tipos: null },
  { key: 'parametros',     titulo: 'Parâmetros de Gravação',  descricao: 'Hachura, ângulo, velocidade e potência por tipo/cor',   icone: Sliders,         tipos: [
    { key: 'pulseira', label: 'Pulseiras / Folheados' },
    { key: 'caneta',   label: 'Canetas' },
    { key: 'copo',     label: 'Copos / Garrafas' },
  ]},
  { key: 'duvidas',        titulo: 'Dúvidas Gerais',          descricao: 'Erros comuns e soluções',                                icone: HelpCircle,      tipos: null },
];

export default function PassoAPassoView() {
  const toast = useToast();
  const [passos, setPassos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secaoAtiva, setSecaoAtiva] = useState('setup');
  const [tipoAtivo, setTipoAtivo] = useState({}); // { posicionamento: 'stanley', parametros: 'pulseira' }
  const [editandoId, setEditandoId] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getGravacaoPassos();
        setPassos(data);
      } catch (e) {
        toast.error('Erro ao carregar passos: ' + (e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const secaoDef = useMemo(() => SECOES.find((s) => s.key === secaoAtiva), [secaoAtiva]);
  const tipoAtivoSecao = tipoAtivo[secaoAtiva] || (secaoDef?.tipos?.[0]?.key ?? null);

  const passosDaSecao = useMemo(() => {
    let filtrados = passos.filter((p) => p.secao === secaoAtiva);
    if (secaoDef?.tipos) {
      filtrados = filtrados.filter((p) => p.tipo_produto === tipoAtivoSecao);
    }
    return filtrados.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  }, [passos, secaoAtiva, secaoDef, tipoAtivoSecao]);

  const iniciarEdicao = (passo) => {
    setEditandoId(passo.id);
    setEditData({
      titulo: passo.titulo || '',
      descricao: passo.descricao || '',
      fotos: passo.fotos || [],
    });
  };

  const salvarEdicao = async () => {
    const id = editandoId;
    try {
      const atualizado = await atualizarGravacaoPasso(id, editData);
      setPassos((prev) => prev.map((p) => (p.id === id ? atualizado : p)));
      setEditandoId(null);
      toast.success('Passo atualizado.');
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e.message || e));
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditData({});
  };

  const adicionarPasso = async () => {
    const maxOrdem = passosDaSecao.reduce((max, p) => Math.max(max, p.ordem || 0), 0);
    const payload = {
      secao: secaoAtiva,
      tipo_produto: secaoDef?.tipos ? tipoAtivoSecao : null,
      ordem: maxOrdem + 10,
      titulo: 'Novo passo',
      descricao: '',
      fotos: [],
    };
    try {
      const novo = await criarGravacaoPasso(payload);
      setPassos((prev) => [...prev, novo]);
      iniciarEdicao(novo);
    } catch (e) {
      toast.error('Erro ao criar: ' + (e.message || e));
    }
  };

  const excluirPasso = async (id) => {
    if (!window.confirm('Excluir este passo?')) return;
    try {
      await deletarGravacaoPasso(id);
      setPassos((prev) => prev.filter((p) => p.id !== id));
      if (editandoId === id) cancelarEdicao();
      toast.success('Passo excluído.');
    } catch (e) {
      toast.error('Erro ao excluir: ' + (e.message || e));
    }
  };

  const moverPasso = async (id, direcao) => {
    const idx = passosDaSecao.findIndex((p) => p.id === id);
    const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvoIdx < 0 || alvoIdx >= passosDaSecao.length) return;
    const a = passosDaSecao[idx];
    const b = passosDaSecao[alvoIdx];
    try {
      const [au, bu] = await Promise.all([
        atualizarGravacaoPasso(a.id, { ordem: b.ordem || 0 }),
        atualizarGravacaoPasso(b.id, { ordem: a.ordem || 0 }),
      ]);
      setPassos((prev) => prev.map((p) => (p.id === au.id ? au : p.id === bu.id ? bu : p)));
    } catch (e) {
      toast.error('Erro ao reordenar: ' + (e.message || e));
    }
  };

  const uploadFoto = async (passoId, file) => {
    if (!file) return;
    setUploadingId(passoId);
    try {
      const dataUrl = await compressImageFile(file);
      const passo = passos.find((p) => p.id === passoId);
      const fotos = [...(passo.fotos || []), { data: dataUrl, alt: file.name }];
      const atualizado = await atualizarGravacaoPasso(passoId, { fotos });
      setPassos((prev) => prev.map((p) => (p.id === passoId ? atualizado : p)));
      if (editandoId === passoId) setEditData((d) => ({ ...d, fotos }));
    } catch (e) {
      toast.error('Erro ao subir foto: ' + (e.message || e));
    } finally {
      setUploadingId(null);
    }
  };

  const removerFoto = async (passoId, idx) => {
    const passo = passos.find((p) => p.id === passoId);
    const fotos = (passo.fotos || []).filter((_, i) => i !== idx);
    try {
      const atualizado = await atualizarGravacaoPasso(passoId, { fotos });
      setPassos((prev) => prev.map((p) => (p.id === passoId ? atualizado : p)));
      if (editandoId === passoId) setEditData((d) => ({ ...d, fotos }));
    } catch (e) {
      toast.error('Erro ao remover foto: ' + (e.message || e));
    }
  };

  // Esc fecha lightbox
  useEffect(() => {
    if (!fotoAmpliada) return;
    const h = (e) => { if (e.key === 'Escape') setFotoAmpliada(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fotoAmpliada]);

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Carregando passo a passo…</div>;

  return (
    <div className="space-y-4">
      {/* Navegação das seções */}
      <div className="card p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
        {SECOES.map((s) => {
          const Icon = s.icone;
          const ativa = s.key === secaoAtiva;
          return (
            <button
              key={s.key}
              onClick={() => setSecaoAtiva(s.key)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all ${
                ativa ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              <span className="leading-tight text-center">{s.titulo}</span>
            </button>
          );
        })}
      </div>

      {/* Cabeçalho da seção */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {(() => { const I = secaoDef?.icone; return I && <I size={20} className="text-indigo-500"/>; })()}
              {secaoDef?.titulo}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{secaoDef?.descricao}</p>
          </div>
          <button onClick={adicionarPasso} className="btn-primary text-sm flex-shrink-0">
            <Plus size={14}/> Novo passo
          </button>
        </div>

        {/* Sub-abas por tipo de produto (se aplicável) */}
        {secaoDef?.tipos && (
          <div className="flex flex-wrap gap-1 mt-3">
            {secaoDef.tipos.map((t) => {
              const ativa = tipoAtivoSecao === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTipoAtivo((prev) => ({ ...prev, [secaoAtiva]: t.key }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    ativa ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de passos */}
      {passosDaSecao.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">
          Nenhum passo cadastrado nesta seção. Clique em "Novo passo" pra começar.
        </div>
      ) : (
        <div className="space-y-3">
          {passosDaSecao.map((passo, i) => {
            const editando = editandoId === passo.id;
            return (
              <div key={passo.id} className={`card p-4 ${editando ? 'ring-2 ring-indigo-400' : ''}`}>
                {/* Header do passo */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    {editando ? (
                      <input
                        type="text"
                        className="input flex-1 font-semibold"
                        value={editData.titulo}
                        onChange={(e) => setEditData((d) => ({ ...d, titulo: e.target.value }))}
                        placeholder="Título do passo"
                      />
                    ) : (
                      <h3 className="text-base font-semibold text-slate-800 pt-1">{passo.titulo}</h3>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!editando && (
                      <>
                        <button onClick={() => moverPasso(passo.id, 'up')}   disabled={i === 0}                            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp size={14}/></button>
                        <button onClick={() => moverPasso(passo.id, 'down')} disabled={i === passosDaSecao.length - 1}    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown size={14}/></button>
                        <button onClick={() => iniciarEdicao(passo)}         className="p-1.5 rounded hover:bg-slate-100 text-indigo-600"><Edit2 size={14}/></button>
                        <button onClick={() => excluirPasso(passo.id)}       className="p-1.5 rounded hover:bg-rose-100 text-rose-600"><Trash2 size={14}/></button>
                      </>
                    )}
                    {editando && (
                      <>
                        <button onClick={salvarEdicao}    className="p-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white"><Check size={14}/></button>
                        <button onClick={cancelarEdicao}  className="p-1.5 rounded hover:bg-slate-100"><X size={14}/></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                <div className="ml-11">
                  {editando ? (
                    <textarea
                      className="input w-full min-h-[120px] text-sm leading-relaxed"
                      value={editData.descricao}
                      onChange={(e) => setEditData((d) => ({ ...d, descricao: e.target.value }))}
                      placeholder="Descrição detalhada do passo (aceita quebras de linha)"
                    />
                  ) : (
                    passo.descricao && (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{passo.descricao}</p>
                    )
                  )}

                  {/* Fotos */}
                  {(passo.fotos && passo.fotos.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {passo.fotos.map((foto, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={foto.data}
                            alt={foto.alt || ''}
                            className="w-24 h-24 rounded object-cover border border-slate-200 cursor-zoom-in"
                            onClick={() => setFotoAmpliada(foto.data)}
                          />
                          {editando && (
                            <button
                              onClick={() => removerFoto(passo.id, idx)}
                              className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 grid place-items-center text-xs"
                              title="Remover foto"
                            >×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload de foto */}
                  <div className="mt-3">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors">
                      <Camera size={13}/>
                      {uploadingId === passo.id ? 'Subindo…' : 'Adicionar foto'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadFoto(passo.id, e.target.files?.[0])}
                        disabled={uploadingId === passo.id}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img src={fotoAmpliada} alt="" className="max-w-full max-h-full object-contain rounded"/>
          <button className="absolute top-4 right-4 text-white text-2xl" onClick={() => setFotoAmpliada(null)}>×</button>
        </div>
      )}
    </div>
  );
}
