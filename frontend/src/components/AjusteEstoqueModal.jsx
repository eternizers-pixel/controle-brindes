// Ajuste manual de estoque — entrada (+) ou saída (−) interna.
// Diferente de SaidaModal: aqui não pede destinatário, é um ajuste rápido
// (correção de contagem, devolução interna, perda, etc).
import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import Modal from './Modal';
import { registrarEntrada, registrarSaida } from '../api/client';
import { hoje } from '../utils/helpers';
import { useToast } from './Toast';

export default function AjusteEstoqueModal({ open, brinde, direcao = 'entrada', onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ quantidade: '', data: hoje(), observacao: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isEntrada = direcao === 'entrada';
  const labelAcao = isEntrada ? 'Adicionar ao estoque' : 'Remover do estoque';
  const corBtn = isEntrada ? 'btn-success' : 'btn-danger';
  const corCaixa = isEntrada ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
  const corTexto = isEntrada ? 'text-emerald-800' : 'text-rose-800';

  useEffect(() => {
    if (open) {
      setForm({ quantidade: '', data: hoje(), observacao: '' });
      setErr('');
    }
  }, [open, direcao]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setErr('');
    const qty = Number(form.quantidade);
    if (!qty || qty <= 0) return setErr('Informe uma quantidade válida.');
    if (!form.data) return setErr('Informe a data.');
    if (!isEntrada && qty > Number(brinde?.quantidade_estoque || 0)) {
      return setErr(`Estoque insuficiente. Disponível: ${brinde?.quantidade_estoque}`);
    }
    setLoading(true);
    try {
      if (isEntrada) {
        await registrarEntrada({
          brinde_id: brinde.id,
          quantidade: qty,
          data: form.data,
          observacao: form.observacao || 'Ajuste manual de estoque',
        });
      } else {
        await registrarSaida({
          brinde_id: brinde.id,
          quantidade: qty,
          data: form.data,
          destinatario_nome: null,
          tipo_solicitante: null,
          responsavel: null,
          observacao: form.observacao || 'Ajuste manual de estoque',
        });
      }
      toast.success(
        isEntrada
          ? `+${qty} ${qty > 1 ? 'unidades' : 'unidade'} adicionada(s) a "${brinde.nome}"`
          : `−${qty} ${qty > 1 ? 'unidades' : 'unidade'} removida(s) de "${brinde.nome}"`
      );
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
      title={`${labelAcao} — ${brinde?.nome || ''}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className={corBtn} onClick={submit} disabled={loading}>
            {loading ? 'Salvando…' : (isEntrada ? <><Plus size={14}/> Adicionar</> : <><Minus size={14}/> Remover</>)}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className={`p-2.5 rounded-lg border ${corCaixa} ${corTexto} text-xs`}>
          <strong>Estoque atual:</strong> {brinde?.quantidade_estoque ?? 0} unidades
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Quantidade *</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.quantidade}
              onChange={set('quantidade')}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Data *</label>
            <input className="input" type="date" value={form.data} onChange={set('data')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observação (opcional)</label>
            <textarea
              className="input"
              rows={3}
              value={form.observacao}
              onChange={set('observacao')}
              placeholder={isEntrada
                ? 'Nota fiscal, fornecedor, devolução interna…'
                : 'Motivo do ajuste (perda, contagem, etc.)…'}
            />
          </div>
          {err && <div className="sm:col-span-2 text-rose-600 text-sm">{err}</div>}
        </div>
      </div>
    </Modal>
  );
}
