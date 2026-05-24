import { useState, useEffect } from 'react';
import { Power, PowerOff, Trash2, Plus } from 'lucide-react';
import Modal from './Modal';
import { criarBrinde, atualizarBrinde, excluirBrinde } from '../api/client';
import EntradaModal from './EntradaModal';

export default function BrindeFormModal({ open, brinde, onClose, onSaved }) {
  const isEdit = Boolean(brinde?.id);
  const [form, setForm] = useState({
    nome: '', codigo: '', descricao: '',
    quantidade_estoque: 0, custo_unitario: 0, status: 'ativo',
  });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showEntrada, setShowEntrada] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        nome: brinde.nome || '',
        codigo: brinde.codigo || '',
        descricao: brinde.descricao || '',
        quantidade_estoque: brinde.quantidade_estoque || 0,
        custo_unitario: brinde.custo_unitario || 0,
        status: brinde.status || 'ativo',
      });
      setPreview(brinde.foto || null);
    } else {
      setForm({
        nome: '', codigo: '', descricao: '',
        quantidade_estoque: 0, custo_unitario: 0, status: 'ativo',
      });
      setPreview(null);
    }
    setFoto(null);
    setErr('');
    setShowEntrada(false);
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

  const submit = async (overrideStatus) => {
    setErr('');
    if (!form.nome.trim()) return setErr('Informe o nome do brinde.');
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        codigo: form.codigo || null,
        descricao: form.descricao || null,
        categoria_id: null,
        estoque_minimo: 0,
        custo_unitario: Number(form.custo_unitario) || 0,
        status: overrideStatus || form.status,
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

  const toggleStatus = () => {
    const novo = form.status === 'ativo' ? 'inativo' : 'ativo';
    setForm({ ...form, status: novo });
    submit(novo);
  };

  const excluir = async () => {
    if (!isEdit) return;
    const msg = `Tem certeza que deseja EXCLUIR o brinde "${brinde.nome}"?\n\n` +
                `Esta ação remove o brinde e TODO o histórico de entradas/saídas dele.\n` +
                `Não dá pra desfazer.`;
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      await excluirBrinde(brinde.id);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !showEntrada}
        onClose={onClose}
        size="md"
        title={isEdit ? 'Editar brinde' : 'Novo brinde'}
        footer={
          <>
            {isEdit && (
              <div className="w-full sm:w-auto sm:mr-auto flex flex-wrap gap-2">
                <button type="button" className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50"
                        onClick={excluir} disabled={loading} title="Excluir definitivamente">
                  <Trash2 size={14}/> Excluir
                </button>
                <button type="button"
                        className={`btn ${form.status === 'ativo' ? 'btn-outline text-amber-700 border-amber-300 hover:bg-amber-50' : 'btn-outline text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                        onClick={toggleStatus} disabled={loading}>
                  {form.status === 'ativo' ? <><PowerOff size={14}/> Inativar</> : <><Power size={14}/> Reativar</>}
                </button>
              </div>
            )}
            <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn-primary" onClick={() => submit()} disabled={loading}>
              {loading ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Foto + nome */}
          <div className="flex gap-3">
            <label className="block w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-200 grid place-items-center text-slate-400 text-[10px] text-center">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="px-1">Foto</span>
              )}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            <div className="flex-1 space-y-2">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={set('nome')} autoFocus />
              </div>
              <div>
                <label className="label">Código</label>
                <input className="input" value={form.codigo} onChange={set('codigo')}
                       placeholder="SKU (opcional)" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea className="input" rows={2} value={form.descricao} onChange={set('descricao')} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!isEdit && (
              <div>
                <label className="label">Estoque inicial</label>
                <input className="input" type="number" min="0"
                       value={form.quantidade_estoque} onChange={set('quantidade_estoque')} />
              </div>
            )}
            <div className={!isEdit ? '' : 'col-span-2'}>
              <label className="label">Custo unitário (R$)</label>
              <input className="input" type="number" step="0.01" min="0"
                     value={form.custo_unitario} onChange={set('custo_unitario')} />
            </div>
          </div>

          {/* Entrada de estoque - só na edição */}
          {isEdit && (
            <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="font-semibold text-emerald-800">Estoque atual: {form.quantidade_estoque}</div>
                  <div className="text-emerald-700">Adicione novas unidades ao estoque</div>
                </div>
                <button
                  type="button"
                  className="btn-success text-xs px-3 py-2 flex-shrink-0"
                  onClick={() => setShowEntrada(true)}
                >
                  <Plus size={14}/> Adicionar
                </button>
              </div>
            </div>
          )}

          {err && <div className="text-rose-600 text-sm">{err}</div>}
        </div>
      </Modal>

      {/* Modal aninhado de Entrada */}
      {isEdit && (
        <EntradaModal
          open={showEntrada}
          brinde={brinde}
          onClose={() => setShowEntrada(false)}
          onSaved={() => {
            setShowEntrada(false);
            onSaved?.();
            onClose();
          }}
        />
      )}
    </>
  );
}
