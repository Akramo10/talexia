export type StatsPeriod = 'today' | 'week' | 'month' | '30d' | 'custom';

interface StatisticsFiltersProps {
    period: StatsPeriod;
    onPeriodChange: (period: StatsPeriod) => void;
}

export function StatisticsFilters({ period, onPeriodChange }: StatisticsFiltersProps) {
    const options: { value: StatsPeriod; label: string }[] = [
        { value: 'today', label: 'Aujourd’hui' },
        { value: 'week', label: 'Semaine' },
        { value: 'month', label: 'Mois' },
        { value: '30d', label: '30 jours' },
    ];

    return (
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/40 p-1">
            {options.map(option => (
                <button key={option.value} onClick={() => onPeriodChange(option.value)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${period === option.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}
