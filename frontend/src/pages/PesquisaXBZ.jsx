// Pesquisa de preços em massa dos produtos da aba Lançamentos do XBZ.
// Protegida por senha de admin.
import { useState, useMemo } from 'react';
import { Lock, RefreshCw, Search, Package2, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatBRL } from '../utils/helpers';
import { useToast } from '../components/Toast';

const ORDENACOES = [
  { value: 'preco_asc',  label: 'Menor preço' },
  { value: 'preco_desc', label: 'Maior preço' },
  { value: 'az',         label: 'Nome (A-Z)' },
  { value: 'za',         label: 'Nome (Z-A)' },
];

export default function PesquisaXBZ() {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [data, setData] = useState(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('preco_asc');

  const carregar = async (senhaAtual = senha) => {
    setLoading(true);
    setErro('');
    try {
      const r = await fetch(`/api/lancamentos-precos?password=${encodeURIComponent(senhaAtual)}`);
      if (r.status === 401) {
        setErro('Senha incorreta.');
        setAutenticado(false);
        return;
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j.error || `Falha (status ${r.status})`);
        return;
      }
      const j = await r.json();
      setData(j);
      setAutenticado(true);
      toast.success(`${j.total_encontrados} produtos carregados.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  const entrar = (e) => {
    e?.preventDefault?.();
    if (!senha.trim()) return setErro('Informe a senha.');
    carregar(senha);
  };

  const produtosFiltrados = useMemo(() => {
    if (!data?.produtos) return [];
    let lista = data.produtos;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (p) =>
          (p.nome || '').toLowerCase().includes(q) ||
          (p.codigo_amigavel || '').toLowerCase().includes(q) ||
          (p.codigo_composto || '').toLowerCase().includes(q)
      );
    }
    const arr = [...lista];
    switch (ordem) {
      case 'preco_desc': arr.sort((a, b) => Number(b.preco || 0) - Number(a.preco || 0)); break;
      case 'az':         arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')); break;
      case 'za':         arr.sort((a, b) => (b.nome || '').localeCompare(a.nome || '', 'pt-BR')); break;
      case 'preco_asc':
      default:           arr.sort((a, b) => Number(a.preco || 0) - Number(b.preco || 0));
    }
    return arr;
  }, [data, busca, ordem]);

  // ===== Tela de senha =====
  if (!autenticado) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card p-6 sm:p-8 space-y-4">
          <div className="text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-amber-500 text-white items-center justify-center mb-3">
              <Lock size={26} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Pesquisa XBZ</h1>
            <p className="text-slate-500 text-sm mt-1">Área restrita — informe a senha de admin</p>
          </div>

          <form onSubmit={entrar} className="space-y-3">
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoFocus
              />
            </div>
            {erro && <div className="text-rose-600 text-sm">{erro}</div>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Validando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===== Tela autenticada =====
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Pesquisa XBZ — Lançamentos</h1>
          <p className="text-slate-500 text-sm">
            Preços dos produtos da aba "Lançamentos" do XBZ, ordenados do menor pro maior.
          </p>
          {data && (
            <p className="text-xs text-slate-400 mt-1">
              Preços atualizados em {new Date(data.atualizado_em).toLocaleString('pt-BR')}
              {data.lista_codigos_atualizada_em && (
                <> · Lista de códigos de {data.lista_codigos_atualizada_em} <span className="text-slate-300">(peça ao Claude para atualizar)</span></>
              )}
            </p>
          )}
        </div>
        <button
          className="btn-primary w-full md:w-auto"
          onClick={() => carregar()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Recarregar dados
        </button>
      </header>

      {/* Estatísticas */}
      {data && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="card p-3 text-center">
            <div className="text-[11px] text-slate-500 uppercase">Códigos na página</div>
            <div className="text-lg font-bold text-slate-800">{data.total_codigos}</div>
          </div>
          <div className="card p-3 text-center bg-emerald-50">
            <div className="text-[11px] text-emerald-700 uppercase">Com preço</div>
            <div className="text-lg font-bold text-emerald-700">{data.total_encontrados}</div>
          </div>
          <div className="card p-3 text-center bg-amber-50">
            <div className="text-[11px] text-amber-700 uppercase">Sem acesso</div>
            <div className="text-lg font-bold text-amber-700">{data.total_sem_acesso}</div>
          </div>
          <div className="card p-3 text-center bg-brand-50">
            <div className="text-[11px] text-brand-700 uppercase">Menor preço</div>
            <div className="text-lg font-bold text-brand-700">
              {data.produtos[0] ? formatBRL(data.produtos[0].preco) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Busca + ordenação */}
      <div className="card p-3">
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Filtrar por nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-44"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          >
            {ORDENACOES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <div className="card p-3 bg-rose-50 border-rose-200 text-rose-700 text-sm">
          <AlertTriangle className="inline mr-1" size={14} /> {erro}
        </div>
      )}

      {loading && !data && (
        <div className="card p-10 text-center text-slate-500">
          <RefreshCw size={28} className="mx-auto mb-3 animate-spin text-brand-500" />
          Buscando preços de ~250 produtos no XBZ… isso pode levar até 1 minuto.
        </div>
      )}

      {/* Grid de produtos com foto grande */}
      {data && produtosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {produtosFiltrados.map((p, i) => {
            const conteudo = (
              <>
                {/* Foto grande - destaque principal */}
                <div className="relative aspect-square bg-slate-100">
                  {p.foto ? (
                    <img src={p.foto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-300">
                      <Package2 size={56} />
                    </div>
                  )}
                  {/* Rank no canto */}
                  <div className="absolute top-2 left-2">
                    <span className="badge bg-slate-900/70 text-white">#{i + 1}</span>
                  </div>
                  {p.link && (
                    <div className="absolute top-2 right-2">
                      <span className="badge bg-white/90 text-slate-600 shadow-sm" title="Abrir no XBZ">
                        <ExternalLink size={12} />
                      </span>
                    </div>
                  )}
                </div>

                {/* Info abaixo da foto */}
                <div className="p-2.5 sm:p-3 space-y-1 flex-1 flex flex-col">
                  <div className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2 min-h-[2.5rem]">
                    {p.nome}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <div>cód. {p.codigo_amigavel}</div>
                    {p.codigo_composto && p.codigo_composto !== p.codigo_amigavel && (
                      <div className="text-[10px] text-slate-400 truncate">{p.codigo_composto}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-auto pt-1 flex items-baseline justify-between">
                    <span>{p.variantes > 1 ? `${p.variantes} variantes` : ''}</span>
                    <span className="text-base font-bold text-emerald-700">{formatBRL(p.preco)}</span>
                  </div>
                </div>
              </>
            );
            return p.link ? (
              <a
                key={p.id}
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="card overflow-hidden flex flex-col transition-all hover:shadow-soft active:scale-[.99] hover:border-amber-200"
                title="Abrir no XBZ"
              >
                {conteudo}
              </a>
            ) : (
              <div key={p.id} className="card overflow-hidden flex flex-col">
                {conteudo}
              </div>
            );
          })}
        </div>
      )}

      {data && produtosFiltrados.length === 0 && !loading && (
        <div className="card p-8 text-center text-slate-500">
          {busca ? 'Nenhum produto bate com a busca.' : 'Nenhum produto retornado.'}
        </div>
      )}
    </div>
  );
}
