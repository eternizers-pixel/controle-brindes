// Saída rápida: sempre entrega 1 unidade. Não pede quantidade.
// Se precisar entregar mais, clica no botão "-1" várias vezes.
import { useState, useEffect } from 'react';
import { Minus } from 'lucide-react';
import Modal from './Modal';
import { registrarSaida, getDestinatarios } from '../api/client';
import { hoje, TIPOS_SOLICITANTE } from '../utils/helpers';
import { useToast } from './Toast';

export default function SaidaModal({ open, brinde, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    data: hoje(),
    destinatario_nome: '', tipo_solicitante: '',
    observacao: '',
  });
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        data: hoje(),
        destinatario_nome: '', tipo_solicitante: '',
        observacao: '',
      });
      setErr('');
      getDestinatarios().then(setSugestoes).catch(() => {});
    }
  }, [open]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    if (!brinde || brinde.quantidade_estoque < 1) {
      return setErr(`Estoque insuficiente. Disponível: ${brinde?.quantidade_estoque || 0}`);
    }
    if (!form.data) return setErr('Informe a data.');

    setLoading(true);
    try {
      await registrarSaida({
        brinde_id: brinde.id,
        quantidade: 1,
        data: form.data,
        destinatario_nome: form.destinatario_nome || null,
        tipo_solicitante: form.tipo_solicitante || null,
        responsavel: null,
        observacao: form.observacao || null,
      });
      toast.success(`−1 unidade de "${brinde.nome}" entregue!`);
      onSaved?.();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={brinde ? `Entregar — ${brinde.nome}` : 'Entregar'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-danger" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : <><Minus size={14}/> Confirmar entrega</>}
          </button>
        </>
      }
    >
      {/* Banner — destaca o que vai acontecer */}
      <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2">
        <div className="text-xs text-rose-900">
          Vai entregar <strong>1 unidade</strong> de "{brinde?.nome}"
        </div>
        <div className="text-[11px] text-slate-500 flex-shrink-0">
          Estoque atual: <span className="font-semibold text-slate-700">{brinde?.quantidade_estoque}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Data da entrega</label>
          <input className="input" type="date" value={form.data} onChange={set('data')} autoFocus />
        </div>
        <div>
          <label className="label">Tipo de solicitante</label>
          <select className="input" value={form.tipo_solicitante} onChange={set('tipo_solicitante')}>
            <option value="">— não informado —</option>
            {TIPOS_SOLICITANTE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Para quem foi</label>
          <input
            className="input"
            list="dest-sug"
            value={form.destinatario_nome}
            onChange={set('destinatario_nome')}
            placeholder="Escola, comunidade, evento…"
          />
          <datalist id="dest-sug">
            {sugestoes
              .filter((d) => !form.tipo_solicitante || d.tipo === form.tipo_solicitante)
              .map((d) => <option key={d.id} value={d.nome} />)}
          </datalist>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Observação</label>
          <textarea className="input" rows={3} value={form.observacao} onChange={set('observacao')} />
        </div>
        {err && <div className="sm:col-span-2 text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
