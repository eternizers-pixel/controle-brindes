export default function StatCard({ icon: Icon, label, value, accent = 'brand' }) {
  const accents = {
    brand:   'bg-brand-50 text-brand-700',
    green:   'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    rose:    'bg-rose-50 text-rose-700',
    sky:     'bg-sky-50 text-sky-700',
    violet:  'bg-violet-50 text-violet-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl grid place-items-center ${accents[accent]}`}>
            <Icon size={20} />
          </div>
        )}
        <div>
          <div className="text-xs uppercase text-slate-500 font-semibold">{label}</div>
          <div className="text-2xl font-bold text-slate-800 mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}
