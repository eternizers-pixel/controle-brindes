import { useEffect, useState } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Filter, Trash2, MessageSquare, X, Calendar,
  Package, Users, Tag, DollarSign, Edit2, Save, Clock,
} from 'lucide-react';
import { getMovimentacoes, getBrindes, removerMovimentacao, atualizarMovimentacao, getReservasAtivas, cancelarReservaManual } from '../api/client';
import { formatBRL, formatInt, formatDate, labelTipo, TIPOS_SOLICITANTE } from '../utils/helpers';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Movimentacoes() {
  const toast = useToast();
  const [reservas, setReservas] = useState([]);
  const [movs, setMovs] = useState([]);
  const [brindes, setBrindes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    tipo: '', brinde_id: '', destinatario: '', tipo_solicitante: '', inicio: '', fim: '', periodo: 'todos',
  });
  const [detalheFor, setDetalheFor] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  // Estado de edição da movimentação atual
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    data: '', destinatario_nome: '', tipo_solicitante: '', observacao: '',
  });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v));
      const resAtivas = await getReservasAtivas();
      setReservas(resAtivas);
      const data = await getMovimentacoes(params);
      setMovs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { getBrindes({ status: '' }).then(setBrindes); }, []);
  useEffect(() => { load(); }, [filtros]);

  const set = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });
  const limpar = () => setFiltros({ tipo: '', brinde_id: '', destinatario: '', tipo_solicitante: '', inicio: '', fim: '' });

  const estornar = async (mov) => {
    if (!window.confirm('Estornar esta movimentação? O estoque será revertido. Esta ação não pode ser desfeita.')) return;
    try {
      await removerMovimentacao(mov.id);
      toast.success('Movimentação estornada.');
      setDetalheFor(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const iniciarEdicao = () => {
    if (!detalheFor) return;
    setFormEdit({
      data: detalheFor.data || '',
      destinatario_nome: detalheFor.destinatario_nome || '',
      tipo_solicitante: detalheFor.tipo_solicitante || '',
      observacao: detalheFor.observacao || '',
    });
    setEditando(true);
  };

  const salvarEdicao = async () => {
    if (!detalheFor) return;
    setSalvandoEdit(true);
    try {
      const payload = {
        data: formEdit.data,
        observacao: formEdit.observacao,
      };
      if (detalheFor.tipo === 'saida') {
        payload.destinatario_nome = formEdit.destinatario_nome;
        payload.tipo_solicitante = formEdit.tipo_solicitante;
      }
      const atualizada = await atualizarMovimentacao(detalheFor.id, payload);
      toast.success('Movimentação atualizada.');
      setDetalheFor((d) => d ? { ...d, ...atualizada } : d);
      setEditando(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoEdit(false);
    }
  };

  const fecharDetalhes = () => {
    setDetalheFor(null);
    setEditando(false);
  };

  const setEdit = (k) => (e) => setFormEdit({ ...formEdit, [k]: e.target.value });

  const filtroAtivo = Object.values(filtros).some((v) => v);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Histórico de movimentações</h1>
          <p className="text-slate-500 text-sm">
            {loading ? 'Carregando…' : `${movs.length} ${movs.length === 1 ? 'registro' : 'registros'}`}
          </p>
        </div>
        <button
          className={`btn-outline text-sm flex-shrink-0 ${filtroAtivo ? 'border-brand-400 text-brand-700 bg-brand-50' : ''}`}
          onClick={() => setMostrarFiltros((v) => !v)}
        >
          <Filter size={14}/>
          Filtros
          {filtroAtivo && (
            <span className="ml-1 inline-flex items-center justify-center bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4">
              !
            </span>
          )}
        </button>
      </header>

      {/* Filtros (colapsáveis) */}
      {mostrarFiltros && (
        <div className="card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select className="input w-full" value={filtros.tipo} onChange={set('tipo')}>
                <option value="">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Brinde</label>
              <select className="input w-full" value={filtros.brinde_id} onChange={set('brinde_id')}>
                <option value="">Todos</option>
                {brindes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Solicitante</label>
              <select className="input w-full" value={filtros.tipo_solicitante} onChange={set('tipo_solicitante')}>
                <option value="">Todos</option>
                {TIPOS_SOLICITANTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Destinatário</label>
              <input className="input w-full" placeholder="Nome do destinatário…" value={filtros.destinatario} onChange={set('destinatario')} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Período</label>
              <select className="input w-full" value={filtros.periodo || 'todos'} onChange={(e) => {
                const preset = e.target.value;
                const fmt = (d) => {
                  const y = d.getFullYear(), M = String(d.getMonth()+1).padStart(2,'0'), D = String(d.getDate()).padStart(2,'0');
                  return `${y}-${M}-${D}`;
                };
                const hoje = new Date();
                let inicio = '', fim = '';
                if (preset === 'mes_atual')      { inicio = fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); fim = fmt(hoje); }
                else if (preset === 'ultimos_3') { const d = new Date(hoje); d.setMonth(d.getMonth()-3); inicio = fmt(d); fim = fmt(hoje); }
                else if (preset === 'ultimos_6') { const d = new Date(hoje); d.setMonth(d.getMonth()-6); inicio = fmt(d); fim = fmt(hoje); }
                else if (preset === 'ano')       { inicio = fmt(new Date(hoje.getFullYear(), 0, 1)); fim = fmt(hoje); }
                else if (preset === 'personalizado') { /* mantem */ inicio = filtros.inicio; fim = filtros.fim; }
                setFiltros((f) => ({ ...f, periodo: preset, inicio, fim }));
              }}>
                <option value="todos">Todos</option>
                <option value="mes_atual">Mês atual</option>
                <option value="ultimos_3">Últimos 3 meses</option>
                <option value="ultimos_6">Últimos 6 meses</option>
                <option value="ano">Ano</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            {filtros.periodo === 'personalizado' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data inicial</label>
                  <input className="input w-full" type="date" value={filtros.inicio} onChange={set('inicio')} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data final</label>
                  <input className="input w-full" type="date" value={filtros.fim} onChange={set('fim')} />
                </div>
              </>
            )}
          </div>
          {filtroAtivo && (
            <div className="flex justify-end mt-3">
              <button className="btn-ghost text-sm" onClick={limpar}>
                <X size={14}/> Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

            {reservas.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-3">
            <Clock size={18}/> Brindes reservados (aguardando)
          </h3>
          <div className="space-y-2">
            {reservas.map(r => {
              const b = brindes.find(x => x.id === r.brinde_id);
              const exp = new Date(r.expira_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
              const tipoLabel = r.status === 'pensando' ? 'cliente vai pensar' : 'reservado';
              return (
                <div key={r.id} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border border-amber-200">
                  <div>
                    <strong>{b?.nome || 'Brinde ?'}</strong>
                    <span className="text-slate-500"> — {tipoLabel}, válido até {exp}</span>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm('Liberar essa reserva? O brinde volta a ficar disponível.')) return;
                      try {
                        await cancelarReservaManual(r.id);
                        toast.success('Reserva liberada.');
                        load();
                      } catch (err) {
                        toast.error('Erro ao liberar: ' + (err?.message || err));
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                  >Liberar</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="card p-6 text-slate-500">Carregando…</div>
      ) : movs.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Nenhuma movimentação encontrada.</div>
      ) : (
        <div className="space-y-2">
          {movs.map((m) => {
            const saida = m.tipo === 'saida';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setDetalheFor(m)}
                className={`card w-full text-left p-3 sm:p-4 flex items-center gap-3 hover:shadow-soft active:scale-[.99] transition-all border-l-4 ${
                  saida ? 'border-l-rose-400' : 'border-l-emerald-400'
                }`}
              >
                {/* Ícone do tipo */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 grid place-items-center ${
                  saida ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {saida ? <ArrowDownCircle size={22}/> : <ArrowUpCircle size={22}/>}
                </div>

                {/* Foto do brinde */}
                {m.brinde_foto ? (
                  <img src={m.brinde_foto} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover border border-slate-200 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-lg flex-shrink-0">📦</div>
                )}

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">
                      {m.brinde_nome}
                    </span>
                    <span className={`text-lg font-bold flex-shrink-0 ${saida ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {saida ? '−' : '+'}{formatInt(m.quantidade)}
                    </span>
                  </div>
                  {m.brinde_codigo && (
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {m.brinde_codigo}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={11}/> {formatDate(m.data)}
                    </span>
                    {m.destinatario_nome && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {m.destinatario_nome}
                          {m.tipo_solicitante ? ` (${labelTipo(m.tipo_solicitante)})` : ''}
                        </span>
                      </>
                    )}
                    {Number(m.custo_total) > 0 && (
                      <>
                        <span>·</span>
                        <span>{formatBRL(m.custo_total)}</span>
                      </>
                    )}
                  </div>
                  {m.observacao && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MessageSquare size={11} className="flex-shrink-0"/>
                      <span className="italic truncate">{m.observacao}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes */}
      <Modal
        open={!!detalheFor}
        onClose={fecharDetalhes}
        size="md"
        title={editando ? 'Editar movimentação' : 'Detalhes da movimentação'}
        footer={
          editando ? (
            <div className="w-full flex items-center gap-2 flex-nowrap">
              <button
                type="button"
                className="btn-ghost text-xs px-2 py-1.5"
                onClick={() => setEditando(false)}
                disabled={salvandoEdit}
              >
                Cancelar
              </button>
              <span className="flex-1"/>
              <button
                type="button"
                className="btn-primary text-xs px-3 py-1.5"
                onClick={salvarEdicao}
                disabled={salvandoEdit}
              >
                <Save size={12}/> {salvandoEdit ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-2 flex-nowrap">
              <button
                type="button"
                className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50 text-xs px-2 py-1.5"
                onClick={() => detalheFor && estornar(detalheFor)}
              >
                <Trash2 size={12}/> Estornar
              </button>
              <button
                type="button"
                className="btn-outline border-sky-300 text-sky-700 hover:bg-sky-50 text-xs px-2 py-1.5"
                onClick={iniciarEdicao}
              >
                <Edit2 size={12}/> Editar
              </button>
              <span className="flex-1"/>
              <button
                className="btn-primary text-xs px-3 py-1.5"
                onClick={fecharDetalhes}
              >
                Fechar
              </button>
            </div>
          )
        }
      >
        {detalheFor && (
          <div className="space-y-3">
            {/* Header colorido com tipo e quantidade — sempre visível, mesmo editando */}
            <div className={`p-3 rounded-lg ${detalheFor.tipo === 'saida' ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`badge ${detalheFor.tipo === 'saida' ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'}`}>
                  {detalheFor.tipo === 'saida' ? (
                    <><ArrowDownCircle size={12} className="mr-1"/>Saída</>
                  ) : (
                    <><ArrowUpCircle size={12} className="mr-1"/>Entrada</>
                  )}
                </span>
                <span className={`text-2xl font-bold ${detalheFor.tipo === 'saida' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {detalheFor.tipo === 'saida' ? '−' : '+'}{formatInt(detalheFor.quantidade)}
                  <span className="text-sm font-normal ml-1 text-slate-600">
                    {detalheFor.quantidade === 1 ? 'unidade' : 'unidades'}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {detalheFor.brinde_foto ? (
                  <img src={detalheFor.brinde_foto} alt="" className="w-9 h-9 rounded object-cover border border-slate-200 flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">📦</div>
                )}
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong className="text-slate-800">{detalheFor.brinde_nome}</strong>
                  {detalheFor.brinde_codigo && (
                    <div className="text-slate-500 font-mono text-[10px] mt-0.5">{detalheFor.brinde_codigo}</div>
                  )}
                </div>
              </div>
            </div>

            {editando ? (
              /* MODO EDIÇÃO */
              <div className="space-y-3">
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Só é possível editar data, destinatário, tipo de solicitante e observação.
                  A quantidade não pode ser alterada — pra isso, estorne e registre uma nova entrega.
                </div>

                <div>
                  <label className="label">Data</label>
                  <input
                    className="input"
                    type="date"
                    value={formEdit.data}
                    onChange={setEdit('data')}
                    autoFocus
                  />
                </div>

                {detalheFor.tipo === 'saida' && (
                  <>
                    <div>
                      <label className="label">Para quem foi (destinatário)</label>
                      <input
                        className="input"
                        value={formEdit.destinatario_nome}
                        onChange={setEdit('destinatario_nome')}
                        placeholder="Escola, comunidade, evento…"
                      />
                    </div>
                    <div>
                      <label className="label">Tipo de solicitante</label>
                      <select
                        className="input"
                        value={formEdit.tipo_solicitante}
                        onChange={setEdit('tipo_solicitante')}
                      >
                        <option value="">— não informado —</option>
                        {TIPOS_SOLICITANTE.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="label">Observação</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formEdit.observacao}
                    onChange={setEdit('observacao')}
                  />
                </div>
              </div>
            ) : (
              /* MODO VISUALIZAÇÃO */
              <>
                {/* Informações em grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <DetalheCampo
                    icon={Calendar}
                    label="Data"
                    value={formatDate(detalheFor.data)}
                  />
                  {Number(detalheFor.custo_total) > 0 && (
                    <DetalheCampo
                      icon={DollarSign}
                      label="Custo total"
                      value={formatBRL(detalheFor.custo_total)}
                    />
                  )}
                  {Number(detalheFor.custo_unitario) > 0 && (
                    <DetalheCampo
                      label="Custo unitário"
                      value={formatBRL(detalheFor.custo_unitario)}
                    />
                  )}

                  {detalheFor.tipo === 'saida' && (
                    <>
                      <DetalheCampo
                        icon={Users}
                        label="Destinatário"
                        value={detalheFor.destinatario_nome || '—'}
                        colSpan={2}
                      />
                      <DetalheCampo
                        icon={Tag}
                        label="Tipo solicitante"
                        value={labelTipo(detalheFor.tipo_solicitante) || '—'}
                        colSpan={2}
                      />
                    </>
                  )}
                  {detalheFor.responsavel && (
                    <DetalheCampo
                      label="Responsável"
                      value={detalheFor.responsavel}
                      colSpan={2}
                    />
                  )}
                </div>

                {/* Observação destacada */}
                {detalheFor.observacao ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-slate-500 mb-1.5">
                      <MessageSquare size={12}/> Observação
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-slate-800 whitespace-pre-wrap">
                      {detalheFor.observacao}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Sem observação registrada.</div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetalheCampo({ icon: Icon, label, value, colSpan = 1 }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <div className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon size={10}/>} {label}
      </div>
      <div className="font-medium text-slate-800 text-sm">{value}</div>
    </div>
  );
}
