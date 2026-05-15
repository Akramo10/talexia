import type { Application } from '../../types';
import { Activity, Target, Percent } from 'lucide-react';

interface AnalyticsWidgetProps {
    applications: Application[];
}

export function AnalyticsWidget({ applications }: AnalyticsWidgetProps) {
    const totalApplied = applications.filter(app => app.status !== 'Wishlist').length;
    const totalInterviews = applications.filter(
        app => app.status === 'Interview' || app.status === 'Technical Test' || app.status === 'Offer'
    ).length;

    const interviewRatio = totalApplied > 0
        ? Math.round((totalInterviews / totalApplied) * 100)
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-brand-500" />
                <h3 className="text-slate-100 font-display font-medium text-sm tracking-tight">Statistiques Globales</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Envoyées</p>
                        <p className="text-2xl font-display font-bold text-white leading-tight">{totalApplied}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50">
                        <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entretiens</p>
                        <p className="text-2xl font-display font-bold text-success leading-tight">{totalInterviews}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50">
                        <Target className="w-5 h-5 text-success/70" />
                    </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Taux de Succès</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className={`text-2xl font-display font-bold leading-tight ${interviewRatio > 20 ? 'text-success' : 'text-warning'}`}>
                                {interviewRatio}%
                            </p>
                        </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50">
                        <Percent className={`w-5 h-5 ${interviewRatio > 20 ? 'text-success/70' : 'text-warning/70'}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
