import { useState, useEffect } from 'react';
import Modal from './Modal';
import { criarBrinde, atualizarBrinde } from '../api/client';

export default function BrindeFormModal({ open, brinde, onClose, onSaved }) {
  const isEdit = Boolean(brinde?.id);
  const [form, setForm] = useState({
    nome: '', descricao: '',
    quantidade_estoque: 0, custo_unitario: 0, status: 'ativo',
  });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        nome: brinde.nome || '',
        descricao: brinde.descricao || '',
        quantidade_estoque: brinde.quantidade_estoque || 0,
        custo_unitario: brinde.custo_unitario || 0,
        status: brinde.status || 'ativo',
      });
      setPreview(brinde.foto || null);
    } else {
      setForm({
        nome: '', descricao: '',
        quantidade_estoque: 0, custo_unitario: 0, status: 'ativo',
      });
      setPreview(null);
    }
    setFoto(null);
    setErr('');
  }, [open, brinde]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFoto(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    setErr('');
    if (!form.nome.trim()) return setErr('Informe o nome do brinde.');
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        categoria_id: null,           // sem categoria
        estoque_minimo: 0,            // sem alerta de mínimo
        custo_unitario: Number(form.custo_unitario) || 0,
        status: form.status,
        foto: foto !== null ? foto : (isEdit ? undefined : preview),
      };
      if (!isEdit) payload.quantidade_estoque = Number(form.quantidade_estoque) || 0;

      if (isEdit) await atualizarBrinde(brinde.id, payload);
      else await criarBrinde(payload);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Editar brinde' : 'Cadastrar novo brinde'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar brinde'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="label">Foto</label>
          <label className="block aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors grid place-items-center text-slate-400 text-sm">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-center px-2">Clique para<br/>enviar uma foto</span>
            )}
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={set('nome')} />
          </div>

          <div className="col-span-2">
            <label className="label">Descrição</label>
            <textarea className="input" rows={2} value={form.descricao} onChange={set('descricao')} />
          </div>

          {!isEdit && (
            <div>
              <label className="label">Estoque inicial</label>
              <input className="input" type="number" min="0"
                     value={form.quantidade_estoque} onChange={set('quantidade_estoque')} />
            </div>
          )}

          <div className={isEdit ? 'col-span-1' : ''}>
            <label className="label">Custo unitário (R$)</label>
            <input className="input" type="number" step="0.01" min="0"
                   value={form.custo_unitario} onChange={set('custo_unitario')} />
          </div>

          <div className={isEdit ? 'col-span-1' : 'col-span-2'}>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
        {err && <div className="col-span-3 text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
