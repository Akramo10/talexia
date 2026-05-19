interface DashboardChartsProps {
    byContract: Record<string, number>;
    pipeline: Record<string, number>;
}

export function DashboardCharts({ byContract, pipeline }: DashboardChartsProps) {
    const renderBars = (data: Record<string, number>) => {
        const max = Math.max(1, ...Object.values(data));
        return Object.entries(data).map(([label, value]) => (
            <div key={label} className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{label}</span>
                    <span>{value}</span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
                </div>
            </div>
        ));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Types contrat</p>
                {renderBars(byContract)}
            </div>
            <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pipeline</p>
                {renderBars(pipeline)}
            </div>
        </div>
    );
}
