// Pesquisa de preços em massa dos produtos da aba Lançamentos do XBZ.
// Protegida por senha de admin.
import { useState, useMemo } from 'react';
import { Lock, RefreshCw, Search, Package2, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatBRL } from '../utils/helpers';
import { useToast } from '../components/Toast';

export default function PesquisaXBZ() {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [data, setData] = useState(null);
  const [busca, setBusca] = useState('');

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
    if (!busca.trim()) return data.produtos;
    const q = busca.toLowerCase();
    return data.produtos.filter(
      (p) =>
        (p.nome || '').toLowerCase().includes(q) ||
        (p.codigo_amigavel || '').toLowerCase().includes(q) ||
        (p.codigo_composto || '').toLowerCase().includes(q)
    );
  }, [data, busca]);

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

      {/* Busca */}
      <div className="card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="input pl-9"
            placeholder="Filtrar por nome ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
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

      {/* Tabela de produtos */}
      {data && produtosFiltrados.length > 0 && (
        <div className="card overflow-hidden">
          {/* Mobile: lista de cards */}
          <ul className="sm:hidden divide-y divide-slate-100">
            {produtosFiltrados.map((p, i) => (
              <li key={p.id} className="p-3 flex gap-3 items-center">
                <div className="w-12 text-right text-xs text-slate-400 font-mono">#{i + 1}</div>
                {p.foto ? (
                  <img src={p.foto} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded bg-slate-100 grid place-items-center text-slate-300 flex-shrink-0">
                    <Package2 size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.nome}</div>
                  <div className="text-[11px] text-slate-500">{p.codigo_composto || p.codigo_amigavel}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-bold text-emerald-700">{formatBRL(p.preco)}</div>
                  {p.variantes > 1 && (
                    <div className="text-[10px] text-slate-400">{p.variantes} variantes</div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <table className="hidden sm:table w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2 w-10">#</th>
                <th className="text-left">Foto</th>
                <th className="text-left">Produto</th>
                <th className="text-left">Código</th>
                <th className="text-right">Variantes</th>
                <th className="text-right pr-4">Menor preço</th>
                <th className="text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtosFiltrados.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td>
                    {p.foto ? (
                      <img src={p.foto} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-100 grid place-items-center text-slate-300">
                        <Package2 size={18} />
                      </div>
                    )}
                  </td>
                  <td className="font-medium text-slate-800">{p.nome}</td>
                  <td className="text-slate-500 text-xs">
                    <div>{p.codigo_amigavel}</div>
                    {p.codigo_composto && p.codigo_composto !== p.codigo_amigavel && (
                      <div className="text-[10px]">{p.codigo_composto}</div>
                    )}
                  </td>
                  <td className="text-right text-slate-600">{p.variantes}</td>
                  <td className="text-right pr-4 font-bold text-emerald-700">{formatBRL(p.preco)}</td>
                  <td className="text-center">
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-slate-400 hover:text-brand-600"
                        title="Abrir no XBZ"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
