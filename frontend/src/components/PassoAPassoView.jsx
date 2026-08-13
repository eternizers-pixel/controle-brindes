// Painel de Passo a Passo de Gravação Laser — MODO APRESENTAÇÃO.
// Mostra 1 passo grande por vez com botões Anterior/Próximo.
// Botão "Editar" permite editar inline o passo atual.
// Sem a seção "Arte" (Helena usa outro site pra isso).
import { useEffect, useMemo, useState } from 'react';
import {
  Power, MoveHorizontal, Ruler, Sliders, HelpCircle,
  Plus, Trash2, Edit2, Check, X, Camera, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { getGravacaoPassos, criarGravacaoPasso, atualizarGravacaoPasso, deletarGravacaoPasso } from '../api/client';
import { compressImageFile } from '../utils/imagem';
import { useToast } from './Toast';

const SECOES = [
  { key: 'setup',          titulo: 'Setup Inicial',           icone: Power,          tipos: null },
  { key: 'posicionamento', titulo: 'Posicionar o Produto',    icone: MoveHorizontal, tipos: [
    { key: 'stanley',  label: 'Stanley (copos/garrafas)' },
    { key: 'pulseira', label: 'Pulseira' },
    { key: 'caneta',   label: 'Caneta' },
  ]},
  { key: 'altura',         titulo: 'Ajustar Altura do Laser', icone: Ruler,          tipos: null },
  { key: 'parametros',     titulo: 'Parâmetros de Gravação',  icone: Sliders,        tipos: [
    { key: 'pulseira', label: 'Pulseiras / Folheados' },
    { key: 'caneta',   label: 'Canetas' },
    { key: 'copo',     label: 'Copos / Garrafas' },
  ]},
  { key: 'duvidas',        titulo: 'Dúvidas Gerais',          icone: HelpCircle,     tipos: null },
];

export default function PassoAPassoView() {
  const toast = useToast();
  const [passos, setPassos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secaoAtiva, setSecaoAtiva] = useState('setup');
  const [tipoAtivo, setTipoAtivo] = useState({});
  const [indexAtual, setIndexAtual] = useState(0);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploading, setUploading] = useState(false);
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

  // Reset index quando muda secao/tipo
  useEffect(() => {
    setIndexAtual(0);
    setModoEdicao(false);
  }, [secaoAtiva, tipoAtivoSecao]);

  const passoAtual = passosDaSecao[indexAtual];
  const total = passosDaSecao.length;

  // Sincroniza editData com passoAtual quando entra em edição
  useEffect(() => {
    if (modoEdicao && passoAtual) {
      setEditData({
        titulo: passoAtual.titulo || '',
        descricao: passoAtual.descricao || '',
        fotos: passoAtual.fotos || [],
      });
    }
  }, [modoEdicao, passoAtual?.id]);

  // Setas do teclado navegam
  useEffect(() => {
    if (fotoAmpliada) return;
    const h = (e) => {
      if (modoEdicao) return; // não navega em modo edição
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

  const anterior = () => setIndexAtual((i) => Math.max(0, i - 1));
  const proximo  = () => setIndexAtual((i) => Math.min(total - 1, i + 1));

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
      ordem: maxOrdem + 10,
      titulo: 'Novo passo',
      descricao: '',
      fotos: [],
    };
    try {
      const novo = await criarGravacaoPasso(payload);
      setPassos((prev) => [...prev, novo]);
      setIndexAtual(passosDaSecao.length); // vai pro novo
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
    if (!passoAtual) return;
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
    if (!file || !passoAtual) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(file);
      const fotos = [...(editData.fotos || []), { data: dataUrl, alt: file.name }];
      setEditData((d) => ({ ...d, fotos }));
    } catch (e) {
      toast.error('Erro ao processar foto: ' + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const removerFoto = (idx) => {
    setEditData((d) => ({ ...d, fotos: (d.fotos || []).filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Carregando passo a passo…</div>;

  return (
    <div className="space-y-4">
      {/* Navegação das seções */}
      <div className="card p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
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

      {/* Sub-abas por tipo de produto (se aplicável) */}
      {secaoDef?.tipos && (
        <div className="card p-2 flex flex-wrap gap-1">
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

      {/* SLIDE ATUAL */}
      {total === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-400 text-sm mb-3">Nenhum passo cadastrado nesta seção.</p>
          <button onClick={adicionarPasso} className="btn-primary text-sm">
            <Plus size={14}/> Criar primeiro passo
          </button>
        </div>
      ) : (
        <>
          <div className="card p-5 sm:p-8 min-h-[400px] flex flex-col">
            {/* Progresso + ações */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Passo {indexAtual + 1} de {total}
              </div>
              <div className="flex gap-1">
                {!modoEdicao && (
                  <>
                    <button onClick={() => setModoEdicao(true)} className="btn-outline text-xs">
                      <Edit2 size={12}/> Editar
                    </button>
                  </>
                )}
                {modoEdicao && (
                  <>
                    <button onClick={() => moverPasso('up')}   disabled={indexAtual === 0}         className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover pra cima"><ArrowLeft size={14}/></button>
                    <button onClick={() => moverPasso('down')} disabled={indexAtual === total - 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Mover pra baixo"><ArrowRight size={14}/></button>
                    <button onClick={excluirPasso}    className="p-1.5 rounded hover:bg-rose-100 text-rose-600" title="Excluir passo"><Trash2 size={14}/></button>
                    <button onClick={() => setModoEdicao(false)} className="btn-outline text-xs">
                      <X size={12}/> Cancelar
                    </button>
                    <button onClick={salvarEdicao} className="btn-primary text-xs">
                      <Check size={12}/> Salvar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Título grande */}
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

            {/* Conteúdo: foto grande + descrição */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6">
              {/* Fotos */}
              {(modoEdicao || (passoAtual.fotos && passoAtual.fotos.length > 0)) && (
                <div className="lg:w-1/2 flex flex-col gap-2">
                  {(modoEdicao ? editData.fotos : passoAtual.fotos)?.map((foto, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={foto.data}
                        alt={foto.alt || ''}
                        className="w-full max-h-[350px] object-contain bg-slate-50 rounded-lg border border-slate-200 cursor-zoom-in"
                        onClick={() => !modoEdicao && setFotoAmpliada(foto.data)}
                      />
                      {modoEdicao && (
                        <button
                          onClick={() => removerFoto(idx)}
                          className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-7 h-7 grid place-items-center text-sm"
                          title="Remover foto"
                        >×</button>
                      )}
                    </div>
                  ))}
                  {modoEdicao && (
                    <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors">
                      <Camera size={14}/>
                      {uploading ? 'Processando…' : 'Adicionar foto'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadFoto(e.target.files?.[0])}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Descrição */}
              <div className={(modoEdicao || (passoAtual.fotos && passoAtual.fotos.length > 0)) ? 'lg:w-1/2 flex' : 'w-full flex'}>
                {modoEdicao ? (
                  <textarea
                    className="input w-full min-h-[300px] text-base leading-relaxed"
                    value={editData.descricao}
                    onChange={(e) => setEditData((d) => ({ ...d, descricao: e.target.value }))}
                    placeholder="Descrição detalhada do passo (aceita quebras de linha e emojis ⚠️✅❌)"
                  />
                ) : (
                  <p className="text-base sm:text-lg text-slate-700 whitespace-pre-wrap leading-relaxed">{passoAtual.descricao}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navegação Anterior / Próximo */}
          {!modoEdicao && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={anterior}
                disabled={indexAtual === 0}
                className="btn-outline flex-1 sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={16}/> Anterior
              </button>

              {/* Dots de progresso */}
              <div className="flex gap-1.5 items-center">
                {passosDaSecao.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndexAtual(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === indexAtual ? 'bg-indigo-500 w-6' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Passo ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={proximo}
                disabled={indexAtual === total - 1}
                className="btn-primary flex-1 sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo <ArrowRight size={16}/>
              </button>
            </div>
          )}

          {/* Adicionar novo passo (só em modo edição) */}
          {modoEdicao && (
            <div className="text-center">
              <button onClick={adicionarPasso} className="btn-outline text-sm">
                <Plus size={14}/> Adicionar novo passo nesta seção
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img src={fotoAmpliada} alt="" className="max-w-full max-h-full object-contain rounded"/>
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFotoAmpliada(null)}>×</button>
        </div>
      )}
    </div>
  );
}
