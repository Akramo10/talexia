import { useMemo, useState } from 'react';
import type { Application } from '../../types';
import { AnalyticsCards } from './AnalyticsCards';
import { DashboardCharts } from './DashboardCharts';
import { StatisticsFilters } from './StatisticsFilters';
import type { StatsPeriod } from './StatisticsFilters';

interface AnalyticsWidgetProps {
    applications: Application[];
}

function startForPeriod(period: StatsPeriod) {
    const now = new Date();
    if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        return start;
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return start;
}

export function AnalyticsWidget({ applications }: AnalyticsWidgetProps) {
    const [period, setPeriod] = useState<StatsPeriod>('30d');
    const stats = useMemo(() => {
        const start = startForPeriod(period);
        const filtered = applications.filter(app => app.date_sent && new Date(app.date_sent) >= start);
        const sent = filtered.filter(app => app.status !== 'Wishlist').length;
        const responses = filtered.filter(app => ['Follow-up', 'Interview', 'Technical Test', 'Rejected', 'Offer'].includes(app.status)).length;
        const interviews = filtered.filter(app => ['Interview', 'Technical Test'].includes(app.status)).length;
        const rejected = filtered.filter(app => app.status === 'Rejected').length;
        const byContract = filtered.reduce<Record<string, number>>((acc, app) => {
            acc[app.type] = (acc[app.type] || 0) + 1;
            return acc;
        }, {});
        const pipeline = applications.reduce<Record<string, number>>((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {});
        return {
            sent,
            responses,
            responseRate: sent ? Math.round((responses / sent) * 100) : 0,
            interviews,
            rejected,
            byContract,
            pipeline,
        };
    }, [applications, period]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-slate-100 font-display font-medium text-sm tracking-tight">Statistiques</h3>
            </div>
            <StatisticsFilters period={period} onPeriodChange={setPeriod} />
            <AnalyticsCards sent={stats.sent} responses={stats.responses} responseRate={stats.responseRate} interviews={stats.interviews} rejected={stats.rejected} />
            <DashboardCharts byContract={stats.byContract} pipeline={stats.pipeline} />
        </div>
    );
}
