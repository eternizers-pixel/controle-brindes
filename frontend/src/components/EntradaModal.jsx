import { useState, useEffect } from 'react';
import Modal from './Modal';
import { registrarEntrada } from '../api/client';
import { hoje } from '../utils/helpers';

export default function EntradaModal({ open, brinde, onClose, onSaved }) {
  const [form, setForm] = useState({ quantidade: '', data: hoje(), observacao: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ quantidade: '', data: hoje(), observacao: '' });
      setErr('');
    }
  }, [open]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    const qty = Number(form.quantidade);
    if (!qty || qty <= 0) return setErr('Informe uma quantidade válida.');
    if (!form.data) return setErr('Informe a data.');
    setLoading(true);
    try {
      await registrarEntrada({
        brinde_id: brinde.id,
        quantidade: qty,
        data: form.data,
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
      title={`Entrada — ${brinde?.nome || ''}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-success" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : 'Registrar entrada'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade *</label>
          <input className="input" type="number" min="1"
                 value={form.quantidade} onChange={set('quantidade')} autoFocus />
        </div>
        <div>
          <label className="label">Data da entrada *</label>
          <input className="input" type="date" value={form.data} onChange={set('data')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observação (opcional)</label>
          <textarea className="input" rows={3} value={form.observacao} onChange={set('observacao')}
                    placeholder="Nota fiscal, fornecedor, etc." />
        </div>
        {err && <div className="sm:col-span-2 text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
