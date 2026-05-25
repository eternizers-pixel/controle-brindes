import { useState, useEffect } from 'react';
import { Trash2, Power, PowerOff } from 'lucide-react';
import Modal from './Modal';
import { criarPatrocinio, atualizarPatrocinio, excluirPatrocinio } from '../api/client';
import { RECORRENCIAS, FORMAS_PAGAMENTO, hoje } from '../utils/helpers';
import { useToast } from './Toast';

export default function PatrocinioFormModal({ open, patrocinio, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(patrocinio?.id);
  const [form, setForm] = useState({
    nome: '', valor: '', recorrencia: 'unica',
    data_inicio: hoje(), data_fim: '', categoria: '', forma_pagamento: '',
    observacao: '', ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        nome: patrocinio.nome || '',
        valor: patrocinio.valor || '',
        recorrencia: patrocinio.recorrencia || 'unica',
        data_inicio: patrocinio.data_inicio || hoje(),
        data_fim: patrocinio.data_fim || '',
        categoria: patrocinio.categoria || '',
        forma_pagamento: patrocinio.forma_pagamento || '',
        observacao: patrocinio.observacao || '',
        ativo: patrocinio.ativo !== false,
      });
    } else {
      setForm({
        nome: '', valor: '', recorrencia: 'unica',
        data_inicio: hoje(), data_fim: '', categoria: '', forma_pagamento: '',
        observacao: '', ativo: true,
      });
    }
    setErr('');
  }, [open, patrocinio]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    if (!form.nome.trim()) return setErr('Informe o nome do patrocinado.');
    if (!Number(form.valor) || Number(form.valor) <= 0) return setErr('Informe um valor válido.');
    if (!form.data_inicio) return setErr('Informe a data de início.');
    setLoading(true);
    try {
      const payload = {
        ...form,
        data_fim: form.data_fim || null,
        categoria: form.categoria || null,
        forma_pagamento: form.forma_pagamento || null,
      };
      if (isEdit) await atualizarPatrocinio(patrocinio.id, payload);
      else await criarPatrocinio(payload);
      toast.success(isEdit ? `Patrocínio "${form.nome}" atualizado!` : `Patrocínio "${form.nome}" cadastrado!`);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      await atualizarPatrocinio(patrocinio.id, { ativo: !form.ativo });
      toast.success(form.ativo ? 'Patrocínio inativado.' : 'Patrocínio reativado.');
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const excluir = async () => {
    if (!isEdit) return;
    if (!window.confirm(`Excluir o patrocínio "${patrocinio.nome}"? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    try {
      await excluirPatrocinio(patrocinio.id);
      toast.success(`Patrocínio "${patrocinio.nome}" excluído.`);
      onSaved?.();
      onClose();
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
      title={isEdit ? 'Editar patrocínio' : 'Novo patrocínio'}
      footer={
        <>
          {isEdit && (
            <div className="w-full sm:w-auto sm:mr-auto flex gap-2 flex-wrap">
              <button type="button" className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50"
                      onClick={excluir} disabled={loading}>
                <Trash2 size={14}/> Excluir
              </button>
              <button type="button"
                      className={`btn ${form.ativo ? 'btn-outline text-amber-700 border-amber-300 hover:bg-amber-50' : 'btn-outline text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                      onClick={toggleAtivo} disabled={loading}>
                {form.ativo ? <><PowerOff size={14}/> Inativar</> : <><Power size={14}/> Reativar</>}
              </button>
            </div>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Para quem (nome) *</label>
          <input className="input" value={form.nome} onChange={set('nome')}
                 placeholder="Escola Santa Rita, Time Sub-15, ..." autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Valor (R$) *</label>
            <input className="input" type="number" step="0.01" min="0"
                   value={form.valor} onChange={set('valor')} />
          </div>
          <div>
            <label className="label">Recorrência *</label>
            <select className="input" value={form.recorrencia} onChange={set('recorrencia')}>
              {RECORRENCIAS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Data de início *</label>
            <input className="input" type="date" value={form.data_inicio} onChange={set('data_inicio')} />
          </div>
          <div>
            <label className="label">Data fim (opcional)</label>
            <input className="input" type="date" value={form.data_fim} onChange={set('data_fim')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="label">Forma de pagamento</label>
            <select className="input" value={form.forma_pagamento} onChange={set('forma_pagamento')}>
              <option value="">— Selecione —</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Categoria (opcional)</label>
            <input className="input" value={form.categoria} onChange={set('categoria')}
                   placeholder="Esporte, Educação, ..." />
          </div>
        </div>

        <div>
          <label className="label">Observação</label>
          <textarea className="input" rows={2} value={form.observacao} onChange={set('observacao')} />
        </div>

        {err && <div className="text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
