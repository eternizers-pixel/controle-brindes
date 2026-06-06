import { useState, useEffect } from 'react';
import {
  Power, PowerOff, Trash2, Plus, Minus, Search, Loader2, Package2,
} from 'lucide-react';
import Modal from './Modal';
import { criarBrinde, atualizarBrinde, excluirBrinde, buscarNoXBZ } from '../api/client';
import AjusteEstoqueModal from './AjusteEstoqueModal';
import { useToast } from './Toast';
import { compressImageFile } from '../utils/imagem';

export default function BrindeFormModal({ open, brinde, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(brinde?.id);
  const [form, setForm] = useState({
    nome: '', codigo: '', descricao: '',
    quantidade_estoque: 0, custo_unitario: 0, status: 'ativo',
  });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ajusteDirecao, setAjusteDirecao] = useState(null); // 'entrada' | 'saida' | null

  // Busca XBZ
  const [xbzBusca, setXbzBusca] = useState('');
  const [xbzBuscando, setXbzBuscando] = useState(false);
  const [xbzResultados, setXbzResultados] = useState(null);
  const [xbzErro, setXbzErro] = useState('');

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
    setAjusteDirecao(null);
    setXbzBusca('');
    setXbzBuscando(false);
    setXbzResultados(null);
    setXbzErro('');
  }, [open, brinde]);

  const buscarXBZ = async () => {
    if (!xbzBusca.trim()) return;
    setXbzBuscando(true);
    setXbzErro('');
    try {
      const produtos = await buscarNoXBZ(xbzBusca);
      setXbzResultados(produtos);
      if (produtos.length === 0) {
        setXbzErro('Nenhum produto encontrado com esse código no XBZ.');
      }
    } catch (e) {
      setXbzErro(e.message);
      setXbzResultados([]);
    } finally {
      setXbzBuscando(false);
    }
  };

  const usarProdutoXBZ = (p) => {
    setForm((f) => ({
      ...f,
      nome: p.nome,
      codigo: p.codigo_composto || p.codigo,
      custo_unitario: p.preco,
    }));
    if (p.foto) {
      setFoto(p.foto);
      setPreview(p.foto);
    }
    setXbzResultados(null);
    setXbzBusca('');
    toast.success(`Dados preenchidos com "${p.nome}"`);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await compressImageFile(f);
      setFoto(dataUrl);
      setPreview(dataUrl);
    } catch (err) {
      toast.error(err.message || 'Erro ao processar a imagem.');
    } finally {
      e.target.value = '';
    }
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
      toast.success(isEdit ? `Brinde "${form.nome}" atualizado!` : `Brinde "${form.nome}" cadastrado!`);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
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
      toast.success(`Brinde "${brinde.nome}" excluído.`);
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
    <>
      <Modal
        open={open && !ajusteDirecao}
        onClose={onClose}
        size="md"
        title={isEdit ? 'Editar brinde' : 'Novo brinde'}
        footer={
          <div className="w-full flex items-center gap-1.5 flex-nowrap">
            {isEdit && (
              <>
                <button
                  type="button"
                  className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50 text-xs px-2 py-1.5 whitespace-nowrap"
                  onClick={excluir} disabled={loading} title="Excluir definitivamente"
                >
                  <Trash2 size={12}/> Excluir
                </button>
                <button
                  type="button"
                  className={`btn text-xs px-2 py-1.5 whitespace-nowrap ${form.status === 'ativo' ? 'btn-outline text-amber-700 border-amber-300 hover:bg-amber-50' : 'btn-outline text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                  onClick={toggleStatus} disabled={loading}
                >
                  {form.status === 'ativo' ? <><PowerOff size={12}/> Inativar</> : <><Power size={12}/> Reativar</>}
                </button>
              </>
            )}
            <span className="flex-1" />
            <button
              className="btn-ghost text-xs px-2 py-1.5 whitespace-nowrap"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
              onClick={() => submit()}
              disabled={loading}
            >
              {loading ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Buscar no XBZ */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <Search size={14} /> Buscar produto no XBZ
              {isEdit && <span className="text-[10px] font-normal text-amber-700">(atualiza nome, código, custo e foto · mantém o estoque atual)</span>}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Cole o código (ex: P$101011)"
                value={xbzBusca}
                onChange={(e) => setXbzBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarXBZ())}
              />
              <button
                type="button"
                className="btn-outline border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0"
                onClick={buscarXBZ}
                disabled={xbzBuscando || !xbzBusca.trim()}
              >
                {xbzBuscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Buscar
              </button>
            </div>

            {xbzErro && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{xbzErro}</div>
            )}

            {xbzResultados && xbzResultados.length > 0 && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                <div className="text-[11px] text-amber-800">
                  {xbzResultados.length} resultado{xbzResultados.length > 1 ? 's' : ''} — clique para preencher
                </div>
                {xbzResultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => usarProdutoXBZ(p)}
                    className="w-full bg-white hover:bg-amber-100 border border-amber-200 rounded-lg p-2 flex items-center gap-2 text-left transition-colors"
                  >
                    {p.foto ? (
                      <img src={p.foto} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                        <Package2 size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{p.nome}</div>
                      <div className="text-[10px] text-slate-500">{p.codigo_composto || p.codigo}</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-700 flex-shrink-0">R$ {p.preco_formatado}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Foto + nome + código */}
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

          {/* Ajuste de estoque — só na edição */}
          {isEdit && (
            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs flex-1 min-w-[120px]">
                  <div className="font-semibold text-slate-800">
                    Estoque atual: <span className={form.quantidade_estoque <= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {form.quantidade_estoque}
                    </span>
                  </div>
                  <div className="text-slate-500">Ajuste manual (entrada ou saída interna)</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    className="btn-success text-xs px-2.5 py-1.5"
                    onClick={() => setAjusteDirecao('entrada')}
                    title="Adicionar unidades ao estoque"
                  >
                    <Plus size={14}/> Adicionar
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-xs px-2.5 py-1.5"
                    onClick={() => setAjusteDirecao('saida')}
                    title="Remover unidades do estoque"
                    disabled={form.quantidade_estoque <= 0}
                  >
                    <Minus size={14}/> Remover
                  </button>
                </div>
              </div>
            </div>
          )}

          {err && <div className="text-rose-600 text-sm">{err}</div>}
        </div>
      </Modal>

      {/* Modal aninhado de ajuste */}
      {isEdit && (
        <AjusteEstoqueModal
          open={!!ajusteDirecao}
          direcao={ajusteDirecao}
          brinde={brinde}
          onClose={() => setAjusteDirecao(null)}
          onSaved={() => {
            setAjusteDirecao(null);
            onSaved?.();
            onClose();
          }}
        />
      )}
    </>
  );
}

