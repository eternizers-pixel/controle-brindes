// Painel de Passo a Passo de Gravação Laser — MODO APRESENTAÇÃO.
// v2:
//   • Seção "gravacao" (F1/F2)
//   • Copos/Garrafas (renomeado de Stanley)
//   • Bolinhas de cor pra copos em Parâmetros
//   • Upload de vídeos direto (Supabase Storage) + link YouTube/Drive
import { useEffect, useMemo, useState } from 'react';
import {
  Power, MoveHorizontal, Ruler, Sliders, HelpCircle, Play,
  Plus, Trash2, Edit2, Check, X, Camera, ArrowLeft, ArrowRight, Video, Link2,
  Coffee, Watch, Pen, Package,
} from 'lucide-react';
import {
  getGravacaoPassos, criarGravacaoPasso, atualizarGravacaoPasso, deletarGravacaoPasso,
  uploadVideoGravacao, deletarVideoGravacao,
} from '../api/client';
import { compressImageFile } from '../utils/imagem';
import { useToast } from './Toast';

const SECOES = [
  { key: 'setup',          titulo: 'Setup Inicial',           icone: Power,          tipos: null },
  { key: 'posicionamento', titulo: 'Posicionar o Produto',    icone: MoveHorizontal, tipos: [
    { key: 'copo',     label: 'Copos / Garrafas' },
    { key: 'pulseira', label: 'Pulseira' },
    { key: 'caneta',   label: 'Caneta' },
    { key: 'outro',    label: 'Outro' },
  ]},
  { key: 'altura',         titulo: 'Ajustar Altura do Laser', icone: Ruler,          tipos: null },
  { key: 'parametros',     titulo: 'Parâmetros de Gravação',  icone: Sliders,        tipos: [
    { key: 'pulseira', label: 'Pulseiras / Folheados' },
    { key: 'caneta',   label: 'Canetas' },
    { key: 'copo',     label: 'Copos / Garrafas' },
  ]},
  { key: 'gravacao',       titulo: 'Gravação (F1/F2)',        icone: Play,           tipos: null },
  { key: 'duvidas',        titulo: 'Dúvidas Gerais',          icone: HelpCircle,     tipos: null },
];

// Cores para o seletor de copo em Parâmetros
const CORES_COPO = [
  { key: 'preto',          label: 'Preto',             bg: '#111827' },
  { key: 'branco',         label: 'Branco',            bg: '#f8fafc', border: '#cbd5e1' },
  { key: 'verde_vermelho', label: 'Verde ou Vermelho', bg: 'linear-gradient(90deg,#10b981 50%,#dc2626 50%)' },
  { key: 'outras',         label: 'Outras cores',      bg: 'linear-gradient(90deg,#a855f7,#f59e0b,#ec4899)' },
];

// Detecta se é URL do YouTube, Vimeo, Google Drive ou vídeo direto
function detectVideoType(url) {
  if (!url) return 'link';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/drive\.google\.com/i.test(url))     return 'drive';
  if (/vimeo\.com/i.test(url))               return 'vimeo';
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return 'file';
  return 'link';
}

// Video native com aspect-ratio dinamico (sem bordas pretas)
function VideoNativo({ url, filename }) {
  const [aspectRatio, setAspectRatio] = useState(null);
  return (
    <video
      src={url}
      controls
      autoPlay
      loop
      muted
      playsInline
      onLoadedMetadata={(e) => {
        const w = e.target.videoWidth;
        const h = e.target.videoHeight;
        if (w && h) setAspectRatio(w / h);
      }}
      className="w-full rounded"
      style={{
        aspectRatio: aspectRatio || undefined,
        maxHeight: '500px',
        objectFit: 'contain',
        background: 'transparent',
      }}
      title={filename || 'video'}
    />
  );
}

function VideoPlayer({ item }) {
  const url = item.url;
  const type = detectVideoType(url);
  // Autoplay + loop + muted (necessario pro autoplay funcionar nos browsers)
  if (type === 'youtube') {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
    const id = m ? m[1] : '';
    // loop no YouTube exige playlist com o proprio id
    const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&modestbranding=1`;
    return <iframe src={src} className="w-full aspect-video rounded" allow="autoplay; encrypted-media" allowFullScreen title={item.filename||'video'} />;
  }
  if (type === 'drive') {
    const m = url.match(/\/d\/([\w-]+)/);
    const id = m ? m[1] : '';
    const embedUrl = id ? `https://drive.google.com/file/d/${id}/preview` : url;
    return <iframe src={embedUrl} className="w-full aspect-video rounded" allow="autoplay" allowFullScreen title={item.filename||'video'} />;
  }
  if (type === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    const id = m ? m[1] : '';
    const src = `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1`;
    return <iframe src={src} className="w-full aspect-video rounded" allow="autoplay" allowFullScreen title={item.filename||'video'} />;
  }
  // Estrategia sem bordas pretas: usar aspect-ratio do proprio arquivo.
  // Detectamos as dimensoes intrinsecas ao carregar e aplicamos style com aspectRatio.
  return <VideoNativo url={url} filename={item.filename} />;
}

export default function PassoAPassoView() {
  const toast = useToast();
  const [passos, setPassos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secaoAtiva, setSecaoAtiva] = useState('setup');
  const [tipoAtivo, setTipoAtivo] = useState({});
  const [corAtiva, setCorAtiva] = useState('preto');
  const [indexAtual, setIndexAtual] = useState(0);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [linkVideoInput, setLinkVideoInput] = useState('');
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [mostrarSeletor, setMostrarSeletor] = useState(true); // Posicionamento: mostrar seletor de tipo primeiro

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

  // Mostra bolinhas de cor apenas em parametros/copo
  const mostraCores = secaoAtiva === 'parametros' && tipoAtivoSecao === 'copo';

  const passosDaSecao = useMemo(() => {
    let filtrados = passos.filter((p) => p.secao === secaoAtiva);
    if (secaoDef?.tipos) {
      filtrados = filtrados.filter((p) => p.tipo_produto === tipoAtivoSecao);
    }
    if (mostraCores) {
      filtrados = filtrados.filter((p) => (p.cor || null) === corAtiva);
    }
    return filtrados.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  }, [passos, secaoAtiva, secaoDef, tipoAtivoSecao, mostraCores, corAtiva]);

  useEffect(() => {
    setModoEdicao(false);
    // Ao entrar em Posicionar sem tipo escolhido nessa visita, mostrar seletor
    if (secaoAtiva === 'posicionamento') setMostrarSeletor(true);
    else setMostrarSeletor(false);
  }, [secaoAtiva]);

  const passoAtual = passosDaSecao[indexAtual];
  const total = passosDaSecao.length;

  useEffect(() => {
    if (modoEdicao && passoAtual) {
      setEditData({
        titulo: passoAtual.titulo || '',
        descricao: passoAtual.descricao || '',
        fotos: passoAtual.fotos || [],
        videos: passoAtual.videos || [],
      });
      setLinkVideoInput('');
    }
  }, [modoEdicao, passoAtual?.id]);

  useEffect(() => {
    if (fotoAmpliada) return;
    const h = (e) => {
      if (modoEdicao) return;
      if (e.key === 'ArrowRight') proximo();
      if (e.key === 'ArrowLeft')  anterior();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [modoEdicao, indexAtual, total, fotoAmpliada]);

  useEffect(() => {
    if (!fotoAmpliada) return;
    const h = (e) => { if (e.key === 'Escape') setFotoAmpliada(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fotoAmpliada]);

  // Filtra passos por (secao, tipoAtivo pra aquela secao, corAtiva se aplicavel)
  const filtrarPassos = (secaoKey) => {
    const secDef = SECOES.find((s) => s.key === secaoKey);
    const tipo = tipoAtivo[secaoKey] || (secDef?.tipos?.[0]?.key ?? null);
    const usaCor = secaoKey === 'parametros' && tipo === 'copo';
    let f = passos.filter((p) => p.secao === secaoKey);
    if (secDef?.tipos) f = f.filter((p) => p.tipo_produto === tipo);
    if (usaCor)        f = f.filter((p) => (p.cor || null) === corAtiva);
    return f.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  };

  const anterior = () => {
    if (indexAtual > 0) { setIndexAtual((i) => i - 1); return; }
    // Se estamos no primeiro passo de Posicionar depois do seletor, volta pro seletor
    if (secaoAtiva === 'posicionamento' && !mostrarSeletor) {
      setMostrarSeletor(true);
      setIndexAtual(0);
      return;
    }
    const idx = SECOES.findIndex((s) => s.key === secaoAtiva);
    if (idx > 0) {
      const prev = SECOES[idx - 1];
      const prevPassos = filtrarPassos(prev.key);
      setIndexAtual(Math.max(0, prevPassos.length - 1));
      setSecaoAtiva(prev.key);
    }
  };
  const proximo = () => {
    if (indexAtual < total - 1) { setIndexAtual((i) => i + 1); return; }
    const idx = SECOES.findIndex((s) => s.key === secaoAtiva);
    if (idx < SECOES.length - 1) {
      const next = SECOES[idx + 1];
      setIndexAtual(0);
      setSecaoAtiva(next.key);
    }
  };

  const salvarEdicao = async () => {
    const id = passoAtual.id;
    try {
      const atualizado = await atualizarGravacaoPasso(id, editData);
      setPassos((prev) => prev.map((p) => (p.id === id ? atualizado : p)));
      setModoEdicao(false);
      toast.success('Passo atualizado.');
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e.message || e));
    }
  };

  const adicionarPasso = async () => {
    const maxOrdem = passosDaSecao.reduce((max, p) => Math.max(max, p.ordem || 0), 0);
    const payload = {
      secao: secaoAtiva,
      tipo_produto: secaoDef?.tipos ? tipoAtivoSecao : null,
      cor: mostraCores ? corAtiva : null,
      ordem: maxOrdem + 10,
      titulo: 'Novo passo',
      descricao: '',
      fotos: [],
      videos: [],
    };
    try {
      const novo = await criarGravacaoPasso(payload);
      setPassos((prev) => [...prev, novo]);
      setIndexAtual(total);
      setModoEdicao(true);
    } catch (e) {
      toast.error('Erro ao criar: ' + (e.message || e));
    }
  };

  const excluirPasso = async () => {
    if (!passoAtual) return;
    if (!window.confirm('Excluir este passo?')) return;
    try {
      await deletarGravacaoPasso(passoAtual.id);
      setPassos((prev) => prev.filter((p) => p.id !== passoAtual.id));
      setIndexAtual((i) => Math.max(0, Math.min(i, total - 2)));
      setModoEdicao(false);
      toast.success('Passo excluído.');
    } catch (e) {
      toast.error('Erro ao excluir: ' + (e.message || e));
    }
  };

  const moverPasso = async (direcao) => {
    const idx = indexAtual;
    const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvoIdx < 0 || alvoIdx >= total) return;
    const a = passosDaSecao[idx];
    const b = passosDaSecao[alvoIdx];
    try {
      const [au, bu] = await Promise.all([
        atualizarGravacaoPasso(a.id, { ordem: b.ordem || 0 }),
        atualizarGravacaoPasso(b.id, { ordem: a.ordem || 0 }),
      ]);
      setPassos((prev) => prev.map((p) => (p.id === au.id ? au : p.id === bu.id ? bu : p)));
      setIndexAtual(alvoIdx);
    } catch (e) {
      toast.error('Erro ao reordenar: ' + (e.message || e));
    }
  };

  const uploadFoto = async (file) => {
    if (!file) return;
    setUploadingFoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      setEditData((d) => ({ ...d, fotos: [...(d.fotos || []), { data: dataUrl, alt: file.name }] }));
    } catch (e) {
      toast.error('Erro ao processar foto: ' + (e.message || e));
    } finally {
      setUploadingFoto(false);
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { url, path, filename } = await uploadVideoGravacao(file);
      setEditData((d) => ({ ...d, videos: [...(d.videos || []), { url, path, filename, source: 'upload' }] }));
    } catch (e) {
      toast.error('Erro ao subir vídeo: ' + (e.message || e));
    } finally {
      setUploadingVideo(false);
    }
  };

  const adicionarLinkVideo = () => {
    const url = linkVideoInput.trim();
    if (!url) return;
    setEditData((d) => ({ ...d, videos: [...(d.videos || []), { url, filename: url, source: 'link' }] }));
    setLinkVideoInput('');
  };

  const removerFoto = (idx) => {
    setEditData((d) => ({ ...d, fotos: (d.fotos || []).filter((_, i) => i !== idx) }));
  };

  const removerVideo = async (idx) => {
    const v = editData.videos?.[idx];
    if (v?.source === 'upload' && v?.path) {
      try { await deletarVideoGravacao(v.path); } catch (e) { /* ignora */ }
    }
    setEditData((d) => ({ ...d, videos: (d.videos || []).filter((_, i) => i !== idx) }));
  };

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
              onClick={() => { setIndexAtual(0); setSecaoAtiva(s.key); }}
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

      {/* Sub-abas por tipo de produto (escondidas no seletor de posicionamento) */}
      {secaoDef?.tipos && !(secaoAtiva === 'posicionamento' && mostrarSeletor) && (
        <div className="card p-2 flex flex-wrap gap-1">
          {secaoDef.tipos.map((t) => {
            const ativa = tipoAtivoSecao === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setIndexAtual(0); setTipoAtivo((prev) => ({ ...prev, [secaoAtiva]: t.key })); }}
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

      {/* Bolinhas de cor pra copo em Parâmetros */}
      {mostraCores && (
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Cor do copo:</span>
          {CORES_COPO.map((c) => {
            const ativa = corAtiva === c.key;
            return (
              <button
                key={c.key}
                onClick={() => { setIndexAtual(0); setCorAtiva(c.key); }}
                className="flex items-center gap-2 group"
                title={c.label}
              >
                <span
                  className={`w-8 h-8 rounded-full transition-all ${
                    ativa ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'ring-1 ring-slate-200 hover:scale-105'
                  }`}
                  style={{ background: c.bg, border: c.border ? `1px solid ${c.border}` : undefined }}
                />
                <span className={`text-sm ${ativa ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* SELETOR de tipo (aparece so em Posicionar antes de escolher) */}
      {secaoAtiva === 'posicionamento' && mostrarSeletor && (() => {
        const opcoes = [
          { key: 'copo',     label: 'Copos / Garrafas', Icon: Coffee,  cor: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
          { key: 'pulseira', label: 'Pulseira',         Icon: Watch,   cor: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' },
          { key: 'caneta',   label: 'Caneta',           Icon: Pen,     cor: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' },
          { key: 'outro',    label: 'Outro',            Icon: Package, cor: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' },
        ];
        return (
          <div className="card p-6 sm:p-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 text-center mb-2">Qual o tipo de produto?</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Escolhe pra ver como posicionar corretamente na máquina</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {opcoes.map((o) => {
                const I = o.Icon;
                return (
                  <button
                    key={o.key}
                    onClick={() => {
                      setTipoAtivo((prev) => ({ ...prev, posicionamento: o.key }));
                      setIndexAtual(0);
                      setMostrarSeletor(false);
                    }}
                    className={`p-6 sm:p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${o.cor}`}
                  >
                    <I size={56} strokeWidth={1.5} />
                    <span className="text-base sm:text-lg font-semibold">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* SLIDE ATUAL (nao aparece se estamos no seletor) */}
      {!(secaoAtiva === 'posicionamento' && mostrarSeletor) && (total === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-400 text-sm mb-3">Nenhum passo cadastrado nesta seção{mostraCores ? ` para "${CORES_COPO.find(c => c.key === corAtiva)?.label}"` : ''}.</p>
          <button onClick={adicionarPasso} className="btn-primary text-sm">
            <Plus size={14}/> Criar primeiro passo
          </button>
        </div>
      ) : (
        <>
          {!passoAtual ? (
            <div className="card p-8 text-center text-slate-400 text-sm">Carregando…</div>
          ) : (
          <div className="card p-5 sm:p-8 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  Passo {indexAtual + 1} de {total}
                </div>
                {secaoAtiva === 'posicionamento' && !mostrarSeletor && (
                  <button
                    onClick={() => { setMostrarSeletor(true); setIndexAtual(0); }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    ← trocar tipo de produto
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {!modoEdicao && (
                  <button onClick={() => setModoEdicao(true)} className="btn-outline text-xs">
                    <Edit2 size={12}/> Editar
                  </button>
                )}
                {modoEdicao && (
                  <>
                    <button onClick={() => moverPasso('up')}   disabled={indexAtual === 0}         className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover pra cima"><ArrowLeft size={14}/></button>
                    <button onClick={() => moverPasso('down')} disabled={indexAtual === total - 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover pra baixo"><ArrowRight size={14}/></button>
                    <button onClick={excluirPasso}    className="p-1.5 rounded hover:bg-rose-100 text-rose-600" title="Excluir passo"><Trash2 size={14}/></button>
                    <button onClick={() => setModoEdicao(false)} className="btn-outline text-xs"><X size={12}/> Cancelar</button>
                    <button onClick={salvarEdicao} className="btn-primary text-xs"><Check size={12}/> Salvar</button>
                  </>
                )}
              </div>
            </div>

            {/* Título */}
            <div className="mb-4">
              {modoEdicao ? (
                <input
                  type="text"
                  className="input w-full text-2xl sm:text-3xl font-bold"
                  value={editData.titulo}
                  onChange={(e) => setEditData((d) => ({ ...d, titulo: e.target.value }))}
                  placeholder="Título do passo"
                />
              ) : (
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">{passoAtual.titulo}</h2>
              )}
            </div>

            {/* Conteúdo */}
            {(() => {
              const fotos  = modoEdicao ? editData.fotos  : passoAtual.fotos;
              const videos = modoEdicao ? editData.videos : passoAtual.videos;
              const temVideos = (videos?.length > 0) || modoEdicao;
              const temFotos  = (fotos?.length  > 0) || modoEdicao;

              return (
                <div className="flex-1 flex flex-col lg:flex-row gap-6">
                  {/* Coluna esquerda: VIDEOS (+ upload de video em edicao) */}
                  {temVideos && (
                    <div className="lg:w-1/2 flex flex-col gap-3">
                      {videos?.map((v, idx) => (
                        <div key={'v'+idx} className="relative group">
                          <VideoPlayer item={v} />
                          {modoEdicao && (
                            <button
                              onClick={() => removerVideo(idx)}
                              className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-7 h-7 grid place-items-center text-sm z-10"
                            >×</button>
                          )}
                        </div>
                      ))}
                      {modoEdicao && (
                        <div className="space-y-2">
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors">
                            <Video size={14}/>
                            {uploadingVideo ? 'Enviando…' : 'Vídeo (upload)'}
                            <input type="file" accept="video/*" className="hidden"
                              onChange={(e) => uploadVideo(e.target.files?.[0])}
                              disabled={uploadingVideo}
                            />
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              className="input flex-1 text-sm"
                              placeholder="Cola link YouTube/Drive/Vimeo aqui"
                              value={linkVideoInput}
                              onChange={(e) => setLinkVideoInput(e.target.value)}
                            />
                            <button onClick={adicionarLinkVideo} disabled={!linkVideoInput.trim()} className="btn-outline text-sm disabled:opacity-50">
                              <Link2 size={14}/> Adicionar link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Coluna direita: DESCRIÇÃO + FOTOS abaixo (+ upload de foto em edicao) */}
                  <div className={temVideos ? 'lg:w-1/2 flex flex-col gap-4' : 'w-full flex flex-col gap-4'}>
                    <div className="flex-1">
                      {modoEdicao ? (
                        <textarea
                          className="input w-full min-h-[240px] text-base leading-relaxed"
                          value={editData.descricao}
                          onChange={(e) => setEditData((d) => ({ ...d, descricao: e.target.value }))}
                          placeholder="Descrição detalhada (aceita quebras de linha e emojis ⚠️✅❌)"
                        />
                      ) : (
                        <p className="text-base sm:text-lg text-slate-700 whitespace-pre-wrap leading-relaxed">{passoAtual.descricao}</p>
                      )}
                    </div>

                    {temFotos && (
                      <div className="flex flex-col gap-2">
                        {fotos?.map((foto, idx) => (
                          <div key={'f'+idx} className="relative group">
                            <img
                              src={foto.data}
                              alt={foto.alt || ''}
                              className="w-full max-h-[280px] object-contain bg-slate-50 rounded-lg border border-slate-200 cursor-zoom-in"
                              onClick={() => !modoEdicao && setFotoAmpliada(foto.data)}
                            />
                            {modoEdicao && (
                              <button
                                onClick={() => removerFoto(idx)}
                                className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-7 h-7 grid place-items-center text-sm"
                              >×</button>
                            )}
                          </div>
                        ))}
                        {modoEdicao && (
                          <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors self-start">
                            <Camera size={14}/>
                            {uploadingFoto ? 'Processando…' : 'Adicionar foto'}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => uploadFoto(e.target.files?.[0])}
                              disabled={uploadingFoto}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          )}

          {/* Navegação */}
          {!modoEdicao && (
            <div className="flex items-center justify-between gap-3">
              {(() => {
                const idxSecao = SECOES.findIndex((s) => s.key === secaoAtiva);
                const desabilitado = indexAtual === 0 && idxSecao === 0;
                return (
                  <button onClick={anterior} disabled={desabilitado} className="btn-outline flex-1 sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed">
                    <ArrowLeft size={16}/> Anterior
                  </button>
                );
              })()}
              <div className="flex gap-1.5 items-center">
                {passosDaSecao.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndexAtual(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === indexAtual ? 'bg-indigo-500 w-6' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
              {(() => {
                const idxSecao = SECOES.findIndex((s) => s.key === secaoAtiva);
                const desabilitado = indexAtual === total - 1 && idxSecao === SECOES.length - 1;
                return (
                  <button onClick={proximo} disabled={desabilitado} className="btn-primary flex-1 sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed">
                    Próximo <ArrowRight size={16}/>
                  </button>
                );
              })()}
            </div>
          )}

          {modoEdicao && (
            <div className="text-center">
              <button onClick={adicionarPasso} className="btn-outline text-sm">
                <Plus size={14}/> Adicionar novo passo nesta seção
              </button>
            </div>
          )}
        </>
      ))}

      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada} alt="" className="max-w-full max-h-full object-contain rounded"/>
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFotoAmpliada(null)}>×</button>
        </div>
      )}
    </div>
  );
}
