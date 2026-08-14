// Painel de Passo a Passo de Gravação Laser — MODO APRESENTAÇÃO.
// v2:
//   • Seção "gravacao" (F1/F2)
//   • Copos/Garrafas (renomeado de Stanley)
//   • Bolinhas de cor pra copos em Parâmetros
//   • Upload de vídeos direto (Supabase Storage) + link YouTube/Drive
import { useEffect, useMemo, useState } from 'react';
import {
  Power, MoveHorizontal, Ruler, Sliders, HelpCircle, Play, Palette,
  Plus, Trash2, Edit2, Check, X, Camera, ArrowLeft, ArrowRight, Video, Link2,
  Beer, Coffee, Watch, Pen, Package, Settings, Zap,
} from 'lucide-react';
import {
  getGravacaoPassos, criarGravacaoPasso, atualizarGravacaoPasso, deletarGravacaoPasso,
  uploadVideoGravacao, deletarVideoGravacao,
  getIconesGravacao, salvarIconeGravacao,
} from '../api/client';
import { compressImageFile } from '../utils/imagem';
import { useToast } from './Toast';

// Icone customizado: pulseira em corrente com coracao (estilo semijoia)
function IconBracelet({ size = 24, strokeWidth = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Corrente em forma de U aberto embaixo (tracejada pra parecer corrente) */}
      <path d="M4 10 C 4 5 8 3 12 3 C 16 3 20 5 20 10" strokeDasharray="1.5 1.8" />
      {/* Cordao ate o coracao */}
      <path d="M4 10 C 5 13 8 15 12 15" strokeDasharray="1.5 1.8" />
      <path d="M20 10 C 19 13 16 15 12 15" strokeDasharray="1.5 1.8" />
      {/* Fio ate o coracao */}
      <line x1="12" y1="15" x2="12" y2="17" />
      {/* Coracao pendente */}
      <path d="M12 22 C 15.5 19 16 17 14.5 16.2 C 13.7 15.7 12.7 16 12 16.8 C 11.3 16 10.3 15.7 9.5 16.2 C 8 17 8.5 19 12 22 Z" fill="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

const SECOES = [
  { key: 'setup',          titulo: 'Setup Inicial',           icone: Power,          tipos: null },
  { key: 'posicionamento', titulo: 'Posicionar o Produto',    icone: MoveHorizontal, tipos: [
    { key: 'copo',     label: 'Copos / Garrafas' },
    { key: 'pulseira', label: 'Pulseira' },
    { key: 'caneta',   label: 'Caneta' },
    { key: 'outro',    label: 'Outro' },
  ]},
  { key: 'altura',         titulo: 'Ajustar Altura do Laser', icone: Ruler,          tipos: null },
  { key: 'importar_arte',  titulo: 'Importar Arte',           icone: Palette,        tipos: null },
  { key: 'parametros',     titulo: 'Parâmetros de Gravação',  icone: Sliders,        tipos: [
    { key: 'pulseira', label: 'Pulseiras / Folheados' },
    { key: 'caneta',   label: 'Canetas' },
    { key: 'copo',     label: 'Copos / Garrafas' },
  ]},
];

// Cores/variantes para o seletor de tipo em Parâmetros (aplica pra copo e caneta)
const CORES_POR_TIPO = {
  copo: [
    { key: 'preto',          label: 'Preto',             bg: '#111827' },
    { key: 'branco',         label: 'Branco',            bg: '#f8fafc', border: '#cbd5e1' },
    { key: 'verde_vermelho', label: 'Verde ou Vermelho', bg: 'linear-gradient(90deg,#10b981 50%,#dc2626 50%)' },
    { key: 'outras',         label: 'Outras cores',      bg: 'linear-gradient(90deg,#a855f7,#f59e0b,#ec4899)' },
  ],
};

// Configuração visual das 4 métricas de parâmetros
const METRICAS_PARAM = [
  { key: 'hachura',    label: 'HACHURA',    cor: 'indigo',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700'  },
  { key: 'angulo',     label: 'ÂNGULO',     cor: 'amber',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   sufixo: '°' },
  { key: 'velocidade', label: 'VELOCIDADE', cor: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { key: 'potencia',   label: 'POTÊNCIA',   cor: 'rose',    bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700'    },
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

// Renderiza texto com *palavra* virando <strong>, preservando line breaks
function TextoFormatado({ children, className }) {
  const texto = String(children || '');
  // Divide por *asterisco* mantendo os capturadores
  const partes = texto.split(/(\*[^*\n]+\*)/g);
  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {partes.map((p, i) => {
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
          return <strong key={i} className="font-bold">{p.slice(1, -1)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

// Card visual pra cada parametro (Hachura, Angulo, Velocidade, Potencia)
function ParamCard({ label, value, color, icone, modoEdicao, onChange, compacto = false }) {
  const palette = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'text-blue-700',    value: 'text-blue-900' },
    purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  label: 'text-purple-700',  value: 'text-purple-900' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'text-amber-700',   value: 'text-amber-900' },
  }[color] || { bg: 'bg-slate-50', border: 'border-slate-200', label: 'text-slate-600', value: 'text-slate-900' };
  return (
    <div className={`${palette.bg} border-2 ${palette.border} rounded-xl text-center flex flex-col items-center gap-0.5 ${compacto ? 'p-1.5' : 'p-3 sm:p-4'}`}>
      {icone && (
        <img src={icone} alt="" className={`${compacto ? 'h-6' : 'h-10'} object-contain max-w-full`} />
      )}
      <div className={`font-bold uppercase tracking-wider ${palette.label} ${compacto ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{label}</div>
      {modoEdicao ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="—"
          className={`w-full mt-0.5 font-black text-center bg-white/70 rounded border border-slate-200 tabular-nums ${palette.value} ${compacto ? 'text-lg' : 'text-2xl sm:text-3xl'}`}
        />
      ) : (
        <div className={`font-black ${palette.value} tabular-nums ${compacto ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>{value || '—'}</div>
      )}
    </div>
  );
}

// Video native com aspect-ratio dinamico (sem bordas pretas)
function VideoNativo({ url, filename, kiosque = false }) {
  const [aspectRatio, setAspectRatio] = useState(null);
  if (kiosque) {
    return (
      <div className="w-full max-w-[300px] aspect-square mx-auto rounded overflow-hidden bg-black">
        <video
          src={url}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          title={filename || 'video'}
        />
      </div>
    );
  }
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
        maxHeight: '55vh',
        maxWidth: '100%',
        objectFit: 'contain',
        background: 'transparent',
      }}
      title={filename || 'video'}
    />
  );
}

// Cards visuais das 4 metricas de parametros
function ParametrosCards({ parametros, modoEdicao, onChange }) {
  // Se nao esta editando e nao tem parametros, nao renderiza nada
  if (!modoEdicao && !parametros) return null;
  const p = parametros || {};
  const setValor = (k, v) => onChange({ ...p, [k]: v });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-1">
      {METRICAS_PARAM.map((m) => {
        const valor = p[m.key];
        const mostrar = valor && String(valor).trim() && valor !== '—';
        return (
          <div key={m.key} className={`${m.bg} ${m.border} border-2 rounded-xl p-3 flex flex-col items-center text-center`}>
            <div className={`text-[10px] sm:text-xs font-bold tracking-wider ${m.text}`}>{m.label}</div>
            {modoEdicao ? (
              <input
                type="text"
                value={p[m.key] || ''}
                onChange={(e) => setValor(m.key, e.target.value)}
                className={`w-full mt-1 text-2xl sm:text-3xl font-bold text-center bg-white/60 rounded border border-slate-200 ${m.text}`}
                placeholder="—"
              />
            ) : (
              <div className={`text-3xl sm:text-4xl font-black mt-1 ${mostrar ? m.text : 'text-slate-400'}`}>
                {mostrar ? `${valor}${m.sufixo || ''}` : '—'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoPlayer({ item, kiosque = false }) {
  const url = item.url;
  const type = detectVideoType(url);
  // Autoplay + loop + muted (necessario pro autoplay funcionar nos browsers)
  if (type === 'youtube') {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
    const id = m ? m[1] : '';
    // loop no YouTube exige playlist com o proprio id
    const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&modestbranding=1`;
    return kiosque
      ? <div className="w-full max-w-[300px] aspect-square mx-auto rounded overflow-hidden bg-black"><iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen title={item.filename||'video'} /></div>
      : <iframe src={src} className="w-full aspect-video rounded" allow="autoplay; encrypted-media" allowFullScreen title={item.filename||'video'} />;
  }
  if (type === 'drive') {
    const m = url.match(/\/d\/([\w-]+)/);
    const id = m ? m[1] : '';
    const embedUrl = id ? `https://drive.google.com/file/d/${id}/preview` : url;
    return kiosque
      ? <div className="w-full max-w-[300px] aspect-square mx-auto rounded overflow-hidden bg-black"><iframe src={embedUrl} className="w-full h-full" allow="autoplay" allowFullScreen title={item.filename||'video'} /></div>
      : <iframe src={embedUrl} className="w-full aspect-video rounded" allow="autoplay" allowFullScreen title={item.filename||'video'} />;
  }
  if (type === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    const id = m ? m[1] : '';
    const src = `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1`;
    return kiosque
      ? <div className="w-full max-w-[300px] aspect-square mx-auto rounded overflow-hidden bg-black"><iframe src={src} className="w-full h-full" allow="autoplay" allowFullScreen title={item.filename||'video'} /></div>
      : <iframe src={src} className="w-full aspect-video rounded" allow="autoplay" allowFullScreen title={item.filename||'video'} />;
  }
  // Estrategia sem bordas pretas: usar aspect-ratio do proprio arquivo.
  // Detectamos as dimensoes intrinsecas ao carregar e aplicamos style com aspectRatio.
  return <VideoNativo url={url} filename={item.filename} kiosque={kiosque} />;
}

export default function PassoAPassoView({ kiosque = false } = {}) {
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
  const [mostrarSeletor, setMostrarSeletor] = useState(true);
  const [icones, setIcones] = useState({}); // { hachura: url, angulo: url, ... }
  const [modalIcones, setModalIcones] = useState(false);
  const [uploadingIcone, setUploadingIcone] = useState(null); // 'hachura' | etc quando esta subindo

  useEffect(() => {
    (async () => {
      try {
        const [data, iconesMap] = await Promise.all([getGravacaoPassos(), getIconesGravacao()]);
        setPassos(data);
        setIcones(iconesMap || {});
      } catch (e) {
        toast.error('Erro ao carregar passos: ' + (e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const secaoDef = useMemo(() => SECOES.find((s) => s.key === secaoAtiva), [secaoAtiva]);
  const tipoAtivoSecao = tipoAtivo[secaoAtiva] || (secaoDef?.tipos?.[0]?.key ?? null);

  // Mostra bolinhas de cor em parametros/copo e parametros/caneta
  const coresDoTipo = (secaoAtiva === 'parametros' && CORES_POR_TIPO[tipoAtivoSecao]) || null;
  const mostraCores = !!coresDoTipo;

  // Ajusta corAtiva se ela nao existir pra esse tipo
  useEffect(() => {
    if (mostraCores && !coresDoTipo.find((c) => c.key === corAtiva)) {
      setCorAtiva(coresDoTipo[0].key);
    }
  }, [mostraCores, tipoAtivoSecao]); // eslint-disable-line react-hooks/exhaustive-deps

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
        parametros: passoAtual.parametros || null,
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
    <div className={kiosque ? "h-full flex flex-col gap-2" : "space-y-4"}>
      {/* Navegação das seções */}
      <div className="card p-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
        {SECOES.map((s) => {
          const Icon = s.icone;
          const ativa = s.key === secaoAtiva;
          return (
            <button
              key={s.key}
              onClick={() => { setIndexAtual(0); setSecaoAtiva(s.key); }}
              className={`flex flex-col items-center gap-0.5 rounded-lg font-medium transition-all ${kiosque ? 'p-1 text-[10px]' : 'p-2 text-xs'} ${
                ativa ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={kiosque ? 14 : 18} />
              <span className="leading-tight text-center">{s.titulo}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-abas por tipo de produto (escondidas no seletor de posicionamento) */}
      {secaoDef?.tipos && !(secaoAtiva === 'posicionamento' && mostrarSeletor) && (
        <div className={`card flex flex-wrap gap-1 flex-shrink-0 ${kiosque ? "p-1" : "p-2"}`}>
          {secaoDef.tipos.map((t) => {
            const ativa = tipoAtivoSecao === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setIndexAtual(0); setTipoAtivo((prev) => ({ ...prev, [secaoAtiva]: t.key })); }}
                className={`rounded-lg text-xs font-medium transition-all ${kiosque ? 'px-2 py-1' : 'px-3 py-1.5'} ${
                  ativa ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Bolinhas de cor pra copo/caneta em Parâmetros */}
      {mostraCores && (
        <div className={`card flex flex-wrap items-center gap-3 flex-shrink-0 ${kiosque ? "p-2" : "p-3"}`}>
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wide">
            {tipoAtivoSecao === 'copo' ? 'Cor do copo:' : 'Variante da caneta:'}
          </span>
          {coresDoTipo.map((c) => {
            const ativa = corAtiva === c.key;
            return (
              <button
                key={c.key}
                onClick={() => { setIndexAtual(0); setCorAtiva(c.key); }}
                className="flex items-center gap-2 group"
                title={c.label}
              >
                <span
                  className={`rounded-full transition-all ${kiosque ? 'w-6 h-6' : 'w-8 h-8'} ${
                    ativa ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'ring-1 ring-slate-200 hover:scale-105'
                  }`}
                  style={{ background: c.bg, border: c.border ? `1px solid ${c.border}` : undefined }}
                />
                <span className={`${kiosque ? 'text-xs' : 'text-sm'} ${ativa ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* SELETOR de tipo (aparece so em Posicionar antes de escolher) */}
      {secaoAtiva === 'posicionamento' && mostrarSeletor && (() => {
        const opcoes = [
          { key: 'copo',     label: 'Copos / Garrafas', Icon: Beer,         cor: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
          { key: 'pulseira', label: 'Pulseira',         Icon: IconBracelet, cor: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' },
          { key: 'caneta',   label: 'Caneta',           Icon: Pen,          cor: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' },
          { key: 'outro',    label: 'Outro',            Icon: Package,      cor: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' },
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
                      // Mapeia o tipo escolhido em Posicionar tambem pra Parametros
                      const paramTipo = o.key === 'outro' ? 'copo' : o.key;
                      const paramCor  = o.key === 'outro' ? 'outras' : null;
                      setTipoAtivo((prev) => ({ ...prev, posicionamento: o.key, parametros: paramTipo }));
                      if (paramCor) setCorAtiva(paramCor);
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
          <p className="text-slate-400 text-sm mb-3">Nenhum passo cadastrado nesta seção{mostraCores ? ` para "${coresDoTipo.find(c => c.key === corAtiva)?.label}"` : ''}.</p>
          <button onClick={adicionarPasso} className="btn-primary text-sm">
            <Plus size={14}/> Criar primeiro passo
          </button>
        </div>
      ) : (
        <>
          {!passoAtual ? (
            <div className="card p-8 text-center text-slate-400 text-sm">Carregando…</div>
          ) : (
          <div className={`card flex flex-col overflow-hidden ${kiosque ? "p-2 sm:p-3 flex-1 min-h-0" : "p-5 sm:p-8 min-h-[400px]"}`}>
            <div className={`flex items-center justify-between gap-3 ${kiosque ? 'mb-2' : 'mb-4'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  Passo {indexAtual + 1} de {total}
                </div>
                {passoAtual?.parametros?.passagem && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                    {passoAtual.parametros.passagem} passagem
                  </span>
                )}
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

            {/* Conteúdo (título fica dentro da coluna da direita, acima da descrição) */}
            {(() => {
              const fotos  = modoEdicao ? editData.fotos  : passoAtual.fotos;
              const videos = modoEdicao ? editData.videos : passoAtual.videos;
              const temVideos = (videos?.length > 0) || modoEdicao;
              const temFotos  = (fotos?.length  > 0) || modoEdicao;

              // Layout: video sempre na esquerda. Se nao ha video mas tem foto, foto vai pra esquerda (bem grande).
              const fotoNaEsquerda = !temVideos && (fotos?.length > 0);
              return (
                <div className={`flex-1 min-h-0 flex flex-col lg:flex-row ${kiosque ? "gap-2 overflow-auto" : "gap-6"}`}>
                  {/* COLUNA ESQUERDA: video, OU foto grande se nao ha video */}
                  {temVideos && (
                    <div className={`lg:w-1/2 flex flex-col gap-3 ${kiosque ? "min-h-0 overflow-hidden" : ""}`}>
                      {videos?.map((v, idx) => (
                        <div key={'v'+idx} className="relative group">
                          <VideoPlayer item={v} kiosque={kiosque} />
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
                  {fotoNaEsquerda && (
                    <div className="lg:w-1/2 flex flex-col gap-2">
                      {fotos.map((foto, idx) => (
                        <div key={'fL'+idx} className="relative group">
                          <img
                            src={foto.data}
                            alt={foto.alt || ''}
                            className={`object-contain bg-slate-50 rounded-lg border border-slate-200 cursor-zoom-in ${kiosque ? 'max-h-[35vh] w-auto max-w-full mx-auto' : 'w-full max-h-[600px]'}`}
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

                  {/* COLUNA DIREITA: DESCRIÇÃO + FOTOS abaixo (so quando foto NAO ta na esquerda) */}
                  <div className={(temVideos || fotoNaEsquerda) ? 'lg:w-1/2 flex flex-col gap-4' : 'w-full flex flex-col gap-4'}>
                    <div>
                      {modoEdicao ? (
                        <input
                          type="text"
                          className="input w-full text-2xl sm:text-3xl font-bold mb-3"
                          value={editData.titulo}
                          onChange={(e) => setEditData((d) => ({ ...d, titulo: e.target.value }))}
                          placeholder="Título do passo"
                        />
                      ) : (
                        <h2 className={`font-bold text-slate-800 leading-tight mb-2 ${kiosque ? 'text-base sm:text-xl' : 'text-2xl sm:text-3xl mb-3'}`}>{passoAtual.titulo}</h2>
                      )}
                    </div>
                    {/* Grid visual de parametros de gravacao (quando o passo tem eles) */}
                    {(passoAtual.parametros || modoEdicao) && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configuração no EZCAD</div>
                          <button onClick={() => setModalIcones(true)} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                            <Settings size={12}/> Editar ícones
                          </button>
                        </div>
                        <div className={`grid grid-cols-2 mb-2 ${kiosque ? 'gap-1.5' : 'gap-3'}`}>
                          <ParamCard label="HACHURA" color="blue" compacto={kiosque}
                            icone={icones.hachura}
                            modoEdicao={modoEdicao}
                            value={modoEdicao ? (editData.parametros?.hachura || '') : passoAtual.parametros?.hachura}
                            onChange={(v) => setEditData((d) => ({ ...d, parametros: { ...(d.parametros||{}), hachura: v } }))}
                          />
                          <ParamCard label="ÂNGULO" color="purple" compacto={kiosque}
                            icone={icones.angulo}
                            modoEdicao={modoEdicao}
                            value={modoEdicao ? (editData.parametros?.angulo || '') : passoAtual.parametros?.angulo}
                            onChange={(v) => setEditData((d) => ({ ...d, parametros: { ...(d.parametros||{}), angulo: v } }))}
                          />
                          <ParamCard label="VELOCIDADE" color="emerald" compacto={kiosque}
                            icone={icones.velocidade}
                            modoEdicao={modoEdicao}
                            value={modoEdicao ? (editData.parametros?.velocidade || '') : passoAtual.parametros?.velocidade}
                            onChange={(v) => setEditData((d) => ({ ...d, parametros: { ...(d.parametros||{}), velocidade: v } }))}
                          />
                          <ParamCard label="POTÊNCIA" color="amber" compacto={kiosque}
                            icone={icones.potencia}
                            modoEdicao={modoEdicao}
                            value={modoEdicao ? (editData.parametros?.potencia || '') : passoAtual.parametros?.potencia}
                            onChange={(v) => setEditData((d) => ({ ...d, parametros: { ...(d.parametros||{}), potencia: v } }))}
                          />
                        </div>
                      </>
                    )}
                    <div className="flex-1">
                      {modoEdicao ? (
                        <textarea
                          className="input w-full min-h-[200px] text-base leading-relaxed"
                          value={editData.descricao}
                          onChange={(e) => setEditData((d) => ({ ...d, descricao: e.target.value }))}
                          placeholder="Descrição detalhada (aceita quebras de linha e emojis ⚠️✅❌)"
                        />
                      ) : (
                        passoAtual.descricao && (
                          <TextoFormatado className={`text-slate-700 leading-relaxed ${kiosque ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'}`}>{passoAtual.descricao}</TextoFormatado>
                        )
                      )}
                    </div>

                    {temFotos && !fotoNaEsquerda && (
                      <div className="flex flex-col gap-2">
                        {fotos?.map((foto, idx) => (
                          <div key={'f'+idx} className="relative group">
                            <img
                              src={foto.data}
                              alt={foto.alt || ''}
                              className={`bg-slate-50 rounded-lg border border-slate-200 cursor-zoom-in ${kiosque ? 'max-h-[30vh] w-auto max-w-full object-contain mx-auto' : 'w-full max-h-[280px] object-contain'}`}
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
            <div className={`flex items-center justify-between gap-3 ${kiosque ? 'flex-shrink-0' : ''}`}>
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

      {/* Modal Editar Icones do EZCAD */}
      {modalIcones && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalIcones(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Ícones do EZCAD</h2>
              <button onClick={() => setModalIcones(false)} className="p-1.5 rounded hover:bg-slate-100"><X size={18}/></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Suba um print/foto de onde clicar no EZCAD pra cada parâmetro. Aparecem em cima de cada card na apresentação.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'hachura',    label: 'Hachura',    color: 'blue'    },
                { key: 'angulo',     label: 'Ângulo',     color: 'purple'  },
                { key: 'velocidade', label: 'Velocidade', color: 'emerald' },
                { key: 'potencia',   label: 'Potência',   color: 'amber'   },
              ].map((m) => (
                <div key={m.key} className="border-2 border-slate-200 rounded-xl p-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2">{m.label}</div>
                  {icones[m.key] ? (
                    <img src={icones[m.key]} alt="" className="w-full h-24 object-contain bg-slate-50 rounded mb-2"/>
                  ) : (
                    <div className="w-full h-24 bg-slate-50 rounded flex items-center justify-center text-slate-300 text-xs mb-2">Sem ícone</div>
                  )}
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors w-full justify-center">
                    <Camera size={12}/>
                    {uploadingIcone === m.key ? 'Enviando…' : (icones[m.key] ? 'Trocar' : 'Fazer upload')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIcone === m.key}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingIcone(m.key);
                        try {
                          const dataUrl = await compressImageFile(file, { maxWidth: 800, maxHeight: 500 });
                          await salvarIconeGravacao(m.key, dataUrl);
                          setIcones((prev) => ({ ...prev, [m.key]: dataUrl }));
                        } catch (err) {
                          toast.error('Erro: ' + (err.message || err));
                        } finally {
                          setUploadingIcone(null);
                        }
                      }}
                    />
                  </label>
                  {icones[m.key] && (
                    <button
                      onClick={async () => {
                        if (!confirm('Remover ícone?')) return;
                        try {
                          await salvarIconeGravacao(m.key, null);
                          setIcones((prev) => ({ ...prev, [m.key]: null }));
                        } catch (err) { toast.error('Erro: ' + (err.message || err)); }
                      }}
                      className="mt-1 text-[11px] text-rose-600 hover:underline w-full text-center"
                    >Remover</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <img src={fotoAmpliada} alt="" className="max-w-full max-h-full object-contain rounded"/>
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFotoAmpliada(null)}>×</button>
        </div>
      )}
    </div>
  );
}
