import { useState, useEffect } from 'react';
import Modal from './Modal';
import { registrarSaida, getDestinatarios } from '../api/client';
import { hoje, TIPOS_SOLICITANTE } from '../utils/helpers';

export default function SaidaModal({ open, brinde, onClose, onSaved }) {
  const [form, setForm] = useState({
    quantidade: '', data: hoje(),
    destinatario_nome: '', tipo_solicitante: '',
    observacao: '',
  });
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        quantidade: '', data: hoje(),
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
    const qty = Number(form.quantidade);
    if (!qty || qty <= 0) return setErr('Informe uma quantidade válida.');
    if (qty > brinde.quantidade_estoque)
      return setErr(`Estoque insuficiente. Disponível: ${brinde.quantidade_estoque}`);

    setLoading(true);
    try {
      await registrarSaida({
        brinde_id: brinde.id,
        quantidade: qty,
        data: form.data,
        destinatario_nome: form.destinatario_nome || null,
        tipo_solicitante: form.tipo_solicitante || null,
        responsavel: null,
        observacao: form.observacao || null,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Saída — ${brinde?.nome || ''}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-danger" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : 'Registrar saída'}
          </button>
        </>
      }
    >
      <div className="mb-3 text-xs text-slate-500">
        Disponível em estoque: <span className="font-semibold text-slate-700">{brinde?.quantidade_estoque}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade *</label>
          <input
            className="input"
            type="number"
            min="1"
            max={brinde?.quantidade_estoque}
            value={form.quantidade}
            onChange={set('quantidade')}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Data da entrega</label>
          <input className="input" type="date" value={form.data} onChange={set('data')} />
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
        <div>
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
