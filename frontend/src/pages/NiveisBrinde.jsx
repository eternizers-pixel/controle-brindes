// Gerenciamento das faixas de valor de orçamento (níveis de brinde).
// Cada nível libera certos brindes pra orçamentos dentro da sua faixa.
import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, ChevronUp, ChevronDown, Award, DollarSign, Layers,
} from 'lucide-react';
import { getNiveis, criarNivel, atualizarNivel, excluirNivel } from '../api/client';
import { formatBRL } from '../utils/helpers';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

// Paleta de cores disponíveis pros badges
const CORES = [
  { value: 'emerald', label: 'Verde',    badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'sky',     label: 'Azul',     badge: 'bg-sky-100 text-sky-700' },
  { value: 'violet',  label: 'Roxo',     badge: 'bg-violet-100 text-violet-700' },
  { value: 'amber',   label: 'Amarelo',  badge: 'bg-amber-100 text-amber-700' },
  { value: 'orange',  label: 'Laranja',  badge: 'bg-orange-100 text-orange-700' },
  { value: 'rose',    label: 'Rosa',     badge: 'bg-rose-100 text-rose-700' },
  { value: 'indigo',  label: 'Índigo',   badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'teal',    label: 'Turquesa', badge: 'bg-teal-100 text-teal-700' },
  { value: 'slate',   label: 'Cinza',    badge: 'bg-slate-100 text-slate-700' },
];

export function badgeCor(cor) {
  return CORES.find((c) => c.value === cor)?.badge || 'bg-slate-100 text-slate-700';
}

export default function NiveisBrinde() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editFor, setEditFor] = useState(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setLista(await getNiveis()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const subir = async (n) => {
    const idx = lista.findIndex((x) => x.id === n.id);
    if (idx <= 0) return;
    const alvo = lista[idx - 1];
    try {
      await Promise.all([
        atualizarNivel(n.id,    { ordem: alvo.ordem }),
        atualizarNivel(alvo.id, { ordem: n.ordem }),
      ]);
      load();
    } catch (e) { toast.error(e.message); }
  };
  const descer = async (n) => {
    const idx = lista.findIndex((x) => x.id === n.id);
    if (idx < 0 || idx >= lista.length - 1) return;
    const alvo = lista[idx + 1];
    try {
      await Promise.all([
        atualizarNivel(n.id,    { ordem: alvo.ordem }),
        atualizarNivel(alvo.id, { ordem: n.ordem }),
      ]);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const remover = async (n) => {
    if (!window.confirm(`Excluir o nível "${n.nome}"?\n\nOs brindes que estavam neste nível ficarão "sem categoria" (não vão pra orçamentos).`)) return;
    try {
      await excluirNivel(n.id);
      toast.success(`Nível "${n.nome}" excluído.`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white grid place-items-center">
            <Award size={20}/>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Níveis de brinde</h1>
            <p className="text-slate-500 text-sm">Faixas de valor de orçamento que liberam quais brindes</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setNovoOpen(true)}>
          <Plus size={16}/> Novo nível
        </button>
      </header>

      <div className="card p-3 bg-indigo-50/40 border-indigo-200 text-xs text-indigo-900">
        <strong>Como funciona:</strong> cada nível define uma faixa de valor de orçamento.
        Quando o orçamento cair na faixa, os brindes desse nível ficam disponíveis. Marque
        "<em>Inclui anteriores</em>" se quiser que esse nível também libere os brindes dos níveis abaixo.
      </div>

      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <Layers size={36} className="mx-auto mb-3 text-slate-300"/>
          <div className="font-medium text-slate-700 mb-1">Nenhum nível cadastrado</div>
          <div className="text-xs mb-4">Crie o primeiro nível pra começar a categorizar seus brindes.</div>
          <button className="btn-primary text-sm" onClick={() => setNovoOpen(true)}>
            <Plus size={14}/> Criar primeiro nível
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((n, idx) => (
            <div key={n.id} className={`card p-3 sm:p-4 flex items-center gap-3 ${!n.ativo ? 'opacity-60' : ''}`}>
              {/* Setas de reordenar */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => subir(n)}
                  disabled={idx === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover pra cima"
                >
                  <ChevronUp size={16}/>
                </button>
                <button
                  type="button"
                  onClick={() => descer(n)}
                  disabled={idx === lista.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover pra baixo"
                >
                  <ChevronDown size={16}/>
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${badgeCor(n.cor)}`}>{n.nome}</span>
                  {n.inclui_anteriores && (
                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">+ anteriores</span>
                  )}
                  {!n.ativo && (
                    <span className="badge bg-slate-200 text-slate-600 text-[10px]">inativo</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <DollarSign size={11}/>
                  {n.valor_min == null && n.valor_max == null && <span>Qualquer valor</span>}
                  {n.valor_min != null && n.valor_max != null && (
                    <span>{formatBRL(n.valor_min)} <strong>até</strong> {formatBRL(n.valor_max)}</span>
                  )}
                  {n.valor_min == null && n.valor_max != null && <span>Até {formatBRL(n.valor_max)}</span>}
                  {n.valor_min != null && n.valor_max == null && <span>Acima de {formatBRL(n.valor_min)}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditFor(n)}
                  className="btn-outline text-xs px-2 py-1.5"
                  title="Editar"
                >
                  <Edit2 size={12}/> Editar
                </button>
                <button
                  type="button"
                  onClick={() => remover(n)}
                  className="text-rose-600 hover:bg-rose-50 rounded-full p-1.5"
                  title="Excluir"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NivelFormModal
        open={!!editFor || novoOpen}
        nivel={editFor}
        proxima_ordem={lista.length}
        onClose={() => { setEditFor(null); setNovoOpen(false); }}
        onSaved={() => { load(); setEditFor(null); setNovoOpen(false); }}
      />
    </div>
  );
}

// ============================================================
// Modal de criar / editar nível
// ============================================================
function NivelFormModal({ open, nivel, proxima_ordem, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!nivel;
  const [form, setForm] = useState({
    nome: '', valor_min: '', valor_max: '',
    inclui_anteriores: false, cor: 'sky', ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        nome: nivel.nome || '',
        valor_min: nivel.valor_min == null ? '' : String(nivel.valor_min),
        valor_max: nivel.valor_max == null ? '' : String(nivel.valor_max),
        inclui_anteriores: !!nivel.inclui_anteriores,
        cor: nivel.cor || 'sky',
        ativo: nivel.ativo !== false,
      });
    } else {
      setForm({
        nome: '', valor_min: '', valor_max: '',
        inclui_anteriores: false, cor: 'sky', ativo: true,
      });
    }
    setErr('');
  }, [open, nivel]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const submit = async () => {
    setErr('');
    if (!form.nome.trim()) return setErr('Informe o nome do nível.');
    const vMin = form.valor_min === '' ? null : Number(form.valor_min);
    const vMax = form.valor_max === '' ? null : Number(form.valor_max);
    if (vMin != null && vMax != null && vMin > vMax) {
      return setErr('O valor mínimo não pode ser maior que o máximo.');
    }
    setLoading(true);
    try {
      const payload = { ...form, valor_min: vMin, valor_max: vMax };
      if (isEdit) {
        await atualizarNivel(nivel.id, payload);
      } else {
        payload.ordem = proxima_ordem;
        await criarNivel(payload);
      }
      toast.success(isEdit ? `Nível "${form.nome}" atualizado!` : `Nível "${form.nome}" criado!`);
      onSaved?.();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Editar nível' : 'Novo nível de brinde'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Nome do nível *</label>
          <input
            className="input"
            value={form.nome}
            onChange={set('nome')}
            placeholder="Básico, Top, Premium…"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Cor do badge</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CORES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, cor: c.value })}
                className={`badge ${c.badge} cursor-pointer transition-all ${
                  form.cor === c.value ? 'ring-2 ring-offset-1 ring-slate-700 scale-105' : ''
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Valor mínimo (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.valor_min}
              onChange={set('valor_min')}
              placeholder="(sem limite)"
            />
            <div className="text-[10px] text-slate-500 mt-1">Vazio = sem mínimo</div>
          </div>
          <div>
            <label className="label">Valor máximo (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.valor_max}
              onChange={set('valor_max')}
              placeholder="(sem limite)"
            />
            <div className="text-[10px] text-slate-500 mt-1">Vazio = sem máximo</div>
          </div>
        </div>

        <label className="flex items-start gap-2 cursor-pointer p-2 bg-slate-50 rounded">
          <input
            type="checkbox"
            checked={form.inclui_anteriores}
            onChange={set('inclui_anteriores')}
            className="mt-0.5"
          />
          <div className="text-xs">
            <div className="font-semibold text-slate-700">Inclui níveis anteriores</div>
            <div className="text-slate-500">Quando o orçamento cair nesta faixa, libera também os brindes dos níveis de ordem menor.</div>
          </div>
        </label>

        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={form.ativo} onChange={set('ativo')}/>
            <span className="text-slate-700">Nível ativo</span>
          </label>
        )}

        {err && <div className="text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
