import { useState } from 'react';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import {
  relEstoque, relSaidas, relPorDestinatario, relCustoEntregas, relPatrocinios,
} from '../api/client';
import { exportarPDF, exportarExcel } from '../utils/export';
import {
  formatBRL, formatInt, formatDate, labelTipo, TIPOS_SOLICITANTE,
  FORMAS_PAGAMENTO, labelFormaPagamento, labelRecorrencia,
  agruparPorFormaPagamento, valorMensalPatrocinio,
} from '../utils/helpers';

export default function Relatorios() {
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' });
  const [tipo, setTipo] = useState('');
  const [formaPag, setFormaPag] = useState('');

  const [estoque, setEstoque] = useState([]);
  const [saidas,  setSaidas]  = useState(null);
  const [porDest, setPorDest] = useState([]);
  const [custos,  setCustos]  = useState(null);
  const [patroc,  setPatroc]  = useState(null);

  const params = () => {
    const p = {};
    if (periodo.inicio) p.inicio = periodo.inicio;
    if (periodo.fim)    p.fim    = periodo.fim;
    return p;
  };

  // --- Estoque ---
  const carregarEstoque = async () => setEstoque(await relEstoque());
  const exportarEstoquePDF = () => {
    exportarPDF({
      titulo: 'Relatório de Estoque Atual',
      colunas: ['Brinde', 'Categoria', 'Estoque', 'Mín', 'Custo unit.', 'Valor total', 'Status'],
      linhas: estoque.map((r) => [
        r.nome, r.categoria || '—', r.quantidade_estoque, r.estoque_minimo,
        formatBRL(r.custo_unitario), formatBRL(r.valor_total), r.status,
      ]),
    });
  };
  const exportarEstoqueXLS = () => {
    exportarExcel({
      titulo: 'Relatório de Estoque Atual',
      sheetName: 'Estoque',
      dados: estoque.map((r) => ({
        Brinde: r.nome, Categoria: r.categoria || '',
        Estoque: r.quantidade_estoque, Mínimo: r.estoque_minimo,
        'Custo unit.': r.custo_unitario, 'Valor total': r.valor_total,
        Status: r.status,
      })),
    });
  };

  // --- Saídas por período ---
  const carregarSaidas = async () => setSaidas(await relSaidas(params()));
  const exportarSaidasPDF = () => {
    exportarPDF({
      titulo: 'Relatório de Saídas',
      subtitulo: `Período: ${periodo.inicio || '—'} a ${periodo.fim || '—'}  ·  Total: ${formatBRL(saidas.total_custo)}  ·  Unidades: ${saidas.total_unidades}`,
      colunas: ['Data', 'Brinde', 'Qtd', 'Destinatário', 'Tipo', 'Observação', 'Custo'],
      linhas: saidas.rows.map((r) => [
        formatDate(r.data), r.brinde, r.quantidade,
        r.destinatario_nome || '—', labelTipo(r.tipo_solicitante),
        r.observacao || '', formatBRL(r.custo_total),
      ]),
    });
  };
  const exportarSaidasXLS = () => {
    exportarExcel({
      titulo: 'Relatório de Saídas',
      sheetName: 'Saídas',
      dados: saidas.rows.map((r) => ({
        Data: r.data, Brinde: r.brinde, Quantidade: r.quantidade,
        Destinatário: r.destinatario_nome || '', 'Tipo de solicitante': labelTipo(r.tipo_solicitante),
        'Custo unit.': r.custo_unitario, 'Custo total': r.custo_total,
        Observação: r.observacao || '',
      })),
    });
  };

  // --- Por destinatário ---
  const carregarPorDest = async () => setPorDest(await relPorDestinatario({ ...params(), tipo: tipo || undefined }));
  const exportarPorDestPDF = () => {
    exportarPDF({
      titulo: 'Relatório por Destinatário',
      subtitulo: `Período: ${periodo.inicio || '—'} a ${periodo.fim || '—'}  ·  Tipo: ${tipo ? labelTipo(tipo) : 'todos'}`,
      colunas: ['Destinatário', 'Tipo', 'Variedade', 'Unidades', 'Custo total'],
      linhas: porDest.map((r) => [r.destinatario, labelTipo(r.tipo), r.variedade, r.unidades, formatBRL(r.custo_total)]),
    });
  };
  const exportarPorDestXLS = () =>
    exportarExcel({
      titulo: 'Relatório por Destinatário',
      sheetName: 'Destinatários',
      dados: porDest.map((r) => ({
        Destinatário: r.destinatario, Tipo: labelTipo(r.tipo),
        'Variedade brindes': r.variedade, 'Unidades entregues': r.unidades,
        'Custo total': r.custo_total,
      })),
    });

  // --- Custo das entregas ---
  const carregarCustos = async () => setCustos(await relCustoEntregas(params()));
  const exportarCustosPDF = () => {
    exportarPDF({
      titulo: 'Custo total das entregas',
      subtitulo: `Período: ${periodo.inicio || '—'} a ${periodo.fim || '—'}  ·  Total: ${formatBRL(custos.custo_total)}`,
      colunas: ['Mês', 'Unidades', 'Custo'],
      linhas: custos.por_mes.map((m) => [m.mes, m.unidades, formatBRL(m.custo)]),
    });
  };

  // --- Patrocínios ---
  const carregarPatroc = async () => {
    const rows = await relPatrocinios({
      ...(formaPag ? { forma_pagamento: formaPag } : {}),
      ...(periodo.inicio ? { inicio: periodo.inicio } : {}),
      ...(periodo.fim ? { fim: periodo.fim } : {}),
    });
    const ativos = rows.filter((r) => r.ativo);
    const grupos = agruparPorFormaPagamento(rows);
    const totalGeral = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    const mensalGeral = ativos.reduce((s, r) => s + valorMensalPatrocinio(r), 0);
    setPatroc({ rows, grupos, totalGeral, mensalGeral });
  };
  const exportarPatrocPDF = () => {
    exportarPDF({
      titulo: 'Relatório de Patrocínios',
      subtitulo: `Período: ${periodo.inicio || '—'} a ${periodo.fim || '—'}  ·  Forma: ${formaPag ? labelFormaPagamento(formaPag) : 'todas'}  ·  Total: ${formatBRL(patroc.totalGeral)}  ·  Mensal: ${formatBRL(patroc.mensalGeral)}`,
      colunas: ['Patrocinado', 'Valor', 'Recorrência', 'Forma de pagamento', 'Categoria', 'Início', 'Fim', 'Ativo'],
      linhas: patroc.rows.map((r) => [
        r.nome, formatBRL(r.valor), labelRecorrencia(r.recorrencia),
        labelFormaPagamento(r.forma_pagamento), r.categoria || '—',
        formatDate(r.data_inicio), r.data_fim ? formatDate(r.data_fim) : '—',
        r.ativo ? 'Sim' : 'Não',
      ]),
    });
  };
  const exportarPatrocXLS = () => {
    exportarExcel({
      titulo: 'Relatório de Patrocínios',
      sheetName: 'Patrocínios',
      dados: patroc.rows.map((r) => ({
        Patrocinado: r.nome,
        Valor: Number(r.valor),
        Recorrência: labelRecorrencia(r.recorrencia),
        'Forma de pagamento': labelFormaPagamento(r.forma_pagamento),
        Categoria: r.categoria || '',
        'Data de início': r.data_inicio,
        'Data fim': r.data_fim || '',
        Ativo: r.ativo ? 'Sim' : 'Não',
        Observação: r.observacao || '',
      })),
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
        <p className="text-slate-500 text-sm">Filtre, visualize e exporte em PDF ou Excel</p>
      </header>

      <div className="card p-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label className="label">Início</label>
          <input className="input" type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} />
        </div>
        <div>
          <label className="label">Fim</label>
          <input className="input" type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} />
        </div>
        <div>
          <label className="label">Tipo de solicitante</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_SOLICITANTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Forma de pagamento (patrocínio)</label>
          <select className="input" value={formaPag} onChange={(e) => setFormaPag(e.target.value)}>
            <option value="">Todas</option>
            {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Estoque */}
      <RelatorioCard
        titulo="Estoque atual"
        descricao="Quantidade, custo unitário e valor total por brinde."
        onLoad={carregarEstoque}
        onPdf={estoque.length ? exportarEstoquePDF : null}
        onXls={estoque.length ? exportarEstoqueXLS : null}
      >
        {estoque.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                <tr><th className="text-left py-2">Brinde</th><th className="text-left">Categoria</th>
                  <th className="text-right">Estoque</th><th className="text-right">Custo unit.</th>
                  <th className="text-right">Valor total</th></tr>
              </thead>
              <tbody>
                {estoque.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{r.nome}</td>
                    <td className="text-slate-600">{r.categoria || '—'}</td>
                    <td className="text-right">{formatInt(r.quantidade_estoque)}</td>
                    <td className="text-right">{formatBRL(r.custo_unitario)}</td>
                    <td className="text-right text-emerald-700 font-semibold">{formatBRL(r.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RelatorioCard>

      {/* Saídas */}
      <RelatorioCard
        titulo="Saídas por período"
        descricao="Lista todas as saídas no período selecionado."
        onLoad={carregarSaidas}
        onPdf={saidas?.rows.length ? exportarSaidasPDF : null}
        onXls={saidas?.rows.length ? exportarSaidasXLS : null}
      >
        {saidas && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Unidades entregues</div>
                <div className="text-xl font-bold">{formatInt(saidas.total_unidades)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Custo total</div>
                <div className="text-xl font-bold text-emerald-700">{formatBRL(saidas.total_custo)}</div>
              </div>
            </div>
            {saidas.rows.length === 0 && <div className="text-slate-400 text-sm">Nenhuma saída no período.</div>}
          </>
        )}
      </RelatorioCard>

      {/* Por destinatário */}
      <RelatorioCard
        titulo="Por escola / comunidade / evento"
        descricao="Agrupado por destinatário, mostrando unidades e custo total."
        onLoad={carregarPorDest}
        onPdf={porDest.length ? exportarPorDestPDF : null}
        onXls={porDest.length ? exportarPorDestXLS : null}
      >
        {porDest.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                <tr><th className="text-left py-2">Destinatário</th><th className="text-left">Tipo</th>
                  <th className="text-right">Variedade</th><th className="text-right">Unidades</th>
                  <th className="text-right">Custo total</th></tr>
              </thead>
              <tbody>
                {porDest.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{r.destinatario}</td>
                    <td className="text-slate-600">{labelTipo(r.tipo)}</td>
                    <td className="text-right">{r.variedade}</td>
                    <td className="text-right">{formatInt(r.unidades)}</td>
                    <td className="text-right text-emerald-700 font-semibold">{formatBRL(r.custo_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RelatorioCard>

      {/* Patrocínios */}
      <RelatorioCard
        titulo="Patrocínios"
        descricao="Lista de patrocínios com forma de pagamento, recorrência e valores."
        onLoad={carregarPatroc}
        onPdf={patroc?.rows.length ? exportarPatrocPDF : null}
        onXls={patroc?.rows.length ? exportarPatrocXLS : null}
      >
        {patroc && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Patrocínios</div>
                <div className="text-xl font-bold">{formatInt(patroc.rows.length)}</div>
              </div>
              <div className="bg-violet-50 rounded-lg p-3">
                <div className="text-xs text-violet-700">Total cadastrado</div>
                <div className="text-xl font-bold text-violet-700">{formatBRL(patroc.totalGeral)}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 col-span-2 md:col-span-1">
                <div className="text-xs text-emerald-700">Mensal recorrente</div>
                <div className="text-xl font-bold text-emerald-700">{formatBRL(patroc.mensalGeral)}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 col-span-2 md:col-span-1">
                <div className="text-xs text-amber-700">Formas em uso</div>
                <div className="text-xl font-bold text-amber-700">{patroc.grupos.length}</div>
              </div>
            </div>

            {patroc.grupos.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase font-semibold text-slate-500 mb-2">Distribuição por forma de pagamento</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {patroc.grupos.map((g) => (
                    <div key={g.value} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{g.label}</span>
                      <span className="text-right">
                        <span className="font-semibold text-slate-800">{formatBRL(g.valor)}</span>
                        <span className="block text-[11px] text-slate-500">{g.count} {g.count === 1 ? 'patrocínio' : 'patrocínios'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patroc.rows.length === 0 ? (
              <div className="text-slate-400 text-sm">Nenhum patrocínio no filtro selecionado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                    <tr>
                      <th className="text-left py-2">Patrocinado</th>
                      <th className="text-left">Recorrência</th>
                      <th className="text-left">Forma de pagamento</th>
                      <th className="text-left">Início</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patroc.rows.map((r) => (
                      <tr key={r.id} className={`border-b border-slate-50 ${!r.ativo ? 'opacity-50' : ''}`}>
                        <td className="py-2 font-medium">{r.nome}</td>
                        <td className="text-slate-600">{labelRecorrencia(r.recorrencia)}</td>
                        <td className="text-slate-600">{labelFormaPagamento(r.forma_pagamento)}</td>
                        <td className="text-slate-600">{formatDate(r.data_inicio)}</td>
                        <td className="text-right font-semibold">{formatBRL(r.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </RelatorioCard>

      {/* Custo */}
      <RelatorioCard
        titulo="Custo total dos brindes entregues"
        descricao="Soma do custo de todas as saídas no período, com quebra mensal."
        onLoad={carregarCustos}
        onPdf={custos?.por_mes.length ? exportarCustosPDF : null}
      >
        {custos && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Movimentações</div>
              <div className="text-xl font-bold">{formatInt(custos.movimentacoes)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Unidades</div>
              <div className="text-xl font-bold">{formatInt(custos.unidades)}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700">Custo total</div>
              <div className="text-xl font-bold text-emerald-700">{formatBRL(custos.custo_total)}</div>
            </div>
            {custos.por_mes.length > 0 && (
              <table className="w-full md:col-span-3 text-sm mt-3">
                <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                  <tr><th className="text-left py-2">Mês</th><th className="text-right">Unidades</th><th className="text-right">Custo</th></tr>
                </thead>
                <tbody>
                  {custos.por_mes.map((m) => (
                    <tr key={m.mes} className="border-b border-slate-50">
                      <td className="py-2">{m.mes}</td>
                      <td className="text-right">{formatInt(m.unidades)}</td>
                      <td className="text-right">{formatBRL(m.custo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </RelatorioCard>
    </div>
  );
}

function RelatorioCard({ titulo, descricao, onLoad, onPdf, onXls, children }) {
  return (
    <div className="card p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          <p className="text-sm text-slate-500">{descricao}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={onLoad}>
            <Download size={15} /> Gerar
          </button>
          {onPdf && (
            <button className="btn-danger" onClick={onPdf}>
              <FileText size={15} /> PDF
            </button>
          )}
          {onXls && (
            <button className="btn-success" onClick={onXls}>
              <FileSpreadsheet size={15} /> Excel
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
