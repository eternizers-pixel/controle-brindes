// Helpers de formatação
export const formatBRL = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatInt = (n) => (Number(n) || 0).toLocaleString('pt-BR');

export const formatDate = (iso) => {
  if (!iso) return '';
  // espera 'YYYY-MM-DD' ou datetime
  const d = iso.length > 10 ? new Date(iso) : new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
};

export const hoje = () => new Date().toISOString().slice(0, 10);

export const TIPOS_SOLICITANTE = [
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'escola',     label: 'Escola' },
  { value: 'evento',     label: 'Evento' },
  { value: 'associacao', label: 'Associação' },
  { value: 'cliente',    label: 'Cliente' },
  { value: 'outro',      label: 'Outro' },
];

export const labelTipo = (v) =>
  TIPOS_SOLICITANTE.find((t) => t.value === v)?.label || (v || '—');

export const nivelClass = (nivel) => {
  switch (nivel) {
    case 'critico':  return 'badge-red';
    case 'baixo':    return 'badge-yellow';
    case 'saudavel': return 'badge-green';
    default:         return 'badge-gray';
  }
};

export const nivelLabel = (nivel) =>
  ({ critico: 'Crítico', baixo: 'Estoque baixo', saudavel: 'Saudável' }[nivel] || '—');
