// Modal para criar / editar um "produto de gravação" — item que não é brinde,
// só serve pra ter os parâmetros de gravação salvos.
// Inclui busca XBZ pra preencher nome/código/foto automaticamente.
import { useState, useEffect } from 'react';
import { Search, Loader2, Package2, Trash2 } from 'lucide-react';
import Modal from './Modal';
import {
  criarProdutoGravacao, atualizarProdutoGravacao, excluirProdutoGravacao, buscarNoXBZ,
} from '../api/client';
import { useToast } from './Toast';

export default function ProdutoGravacaoModal({ open, produto, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const isEdit = Boolean(produto?.id);
  const [form, setForm] = useState({ nome: '', codigo: '', descricao: '' });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Busca XBZ
  const [xbzBusca, setXbzBusca] = useState('');
  const [xbzBuscando, setXbzBuscando] = useState(false);
  const [xbzResultados, setXbzResultados] = useState(null);
  const [xbzErro, setXbzErro] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        nome: produto.nome || '',
        codigo: produto.codigo || '',
        descricao: produto.descricao || '',
      });
      setPreview(produto.foto || null);
    } else {
      setForm({ nome: '', codigo: '', descricao: '' });
      setPreview(null);
    }
    setFoto(null);
    setErr('');
    setXbzBusca('');
    setXbzBuscando(false);
    setXbzResultados(null);
    setXbzErro('');
  }, [open, produto]);

  const buscarXBZ = async () => {
    if (!xbzBusca.trim()) return;
    setXbzBuscando(true);
    setXbzErro('');
    try {
      const produtos = await buscarNoXBZ(xbzBusca);
      setXbzResultados(produtos);
      if (produtos.length === 0) setXbzErro('Nenhum produto encontrado com esse código no XBZ.');
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
    if (!form.nome.trim()) return setErr('Informe o nome do produto.');
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        codigo: form.codigo || null,
        descricao: form.descricao || null,
        foto: foto !== null ? foto : (isEdit ? undefined : preview),
      };
      let saved;
      if (isEdit) saved = await atualizarProdutoGravacao(produto.id, payload);
      else saved = await criarProdutoGravacao({ ...payload, parametros_gravacao: [] });
      toast.success(isEdit ? `Produto "${form.nome}" atualizado!` : `Produto "${form.nome}" cadastrado!`);
      onSaved?.(saved);
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
    if (!window.confirm(`Excluir o produto "${produto.nome}"?\n\nIsto remove o produto e todos os parâmetros configurados pra ele.`)) return;
    setLoading(true);
    try {
      await excluirProdutoGravacao(produto.id);
      toast.success(`Produto "${produto.nome}" excluído.`);
      onDeleted?.(produto.id);
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
      title={isEdit ? 'Editar produto de gravação' : 'Novo produto de gravação'}
      footer={
        <div className="w-full flex items-center gap-1.5 flex-nowrap">
          {isEdit && (
            <button
              type="button"
              className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50 text-xs px-2 py-1.5 whitespace-nowrap"
              onClick={excluir}
              disabled={loading}
            >
              <Trash2 size={12}/> Excluir
            </button>
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
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Salvando…' : isEdit ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Aviso */}
        <div className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded p-2">
          Este produto serve apenas pra guardar parâmetros de gravação. Não vai pra estoque nem aparece em entregas.
        </div>

        {/* Buscar XBZ */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <Search size={14}/> Buscar no XBZ
            {isEdit && <span className="text-[10px] font-normal text-amber-700">(atualiza nome, código e foto)</span>}
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
              {xbzBuscando ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
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
                    <img src={p.foto} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0"/>
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                      <Package2 size={16}/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{p.nome}</div>
                    <div className="text-[10px] text-slate-500">{p.codigo_composto || p.codigo}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Foto + nome + código */}
        <div className="flex gap-3">
          <label className="block w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-200 grid place-items-center text-slate-400 text-[10px] text-center">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover"/>
            ) : (
              <span className="px-1">Foto</span>
            )}
            <input type="file" accept="image/*" onChange={onFile} className="hidden"/>
          </label>
          <div className="flex-1 space-y-2">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={form.nome} onChange={set('nome')} autoFocus/>
            </div>
            <div>
              <label className="label">Código</label>
              <input className="input" value={form.codigo} onChange={set('codigo')} placeholder="SKU (opcional)"/>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} value={form.descricao} onChange={set('descricao')}/>
        </div>

        {err && <div className="text-rose-600 text-sm">{err}</div>}
      </div>
    </Modal>
  );
}
