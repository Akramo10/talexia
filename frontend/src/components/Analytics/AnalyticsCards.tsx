import { Activity, Percent, Target } from 'lucide-react';

interface AnalyticsCardsProps {
    sent: number;
    responses: number;
    responseRate: number;
    interviews: number;
    rejected: number;
}

export function AnalyticsCards({ sent, responses, responseRate, interviews, rejected }: AnalyticsCardsProps) {
    const cards = [
        { label: 'Envoyées', value: sent, icon: Activity, tone: 'text-white' },
        { label: 'Réponses', value: responses, icon: Percent, tone: 'text-info' },
        { label: 'Entretiens', value: interviews, icon: Target, tone: 'text-success' },
        { label: 'Refus', value: rejected, icon: Activity, tone: 'text-danger' },
    ];

    return (
        <div className="grid grid-cols-1 gap-3">
            {cards.map(card => {
                const Icon = card.icon;
                return (
                    <div key={card.label} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                            <p className={`text-2xl font-display font-bold leading-tight ${card.tone}`}>{card.value}</p>
                        </div>
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50">
                            <Icon className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                );
            })}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Taux réponse</p>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.min(responseRate, 100)}%` }} />
                </div>
                <p className="text-sm text-slate-300 font-bold mt-2">{responseRate}%</p>
            </div>
        </div>
    );
}
