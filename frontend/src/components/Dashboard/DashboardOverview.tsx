import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart3, CalendarClock, CheckCircle2, MessageSquareReply, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import { COLUMNS } from '../../types';
import type { Application } from '../../types';

interface DashboardOverviewProps {
  applications: Application[];
  onCreate: () => void;
}

export function DashboardOverview({ applications, onCreate }: DashboardOverviewProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sent = applications.filter((app) => app.status !== 'Wishlist');
    const responses = applications.filter((app) => ['Follow-up', 'Interview', 'Technical Test', 'Offer', 'Rejected'].includes(app.status));
    return {
      total: applications.length,
      interviews: applications.filter((app) => ['Interview', 'Technical Test'].includes(app.status)).length,
      responses: responses.length,
      rejected: applications.filter((app) => app.status === 'Rejected').length,
      responseRate: sent.length ? Math.round((responses.length / sent.length) * 100) : 0,
      month: applications.filter((app) => app.date_sent && new Date(app.date_sent) >= monthStart).length,
      week: applications.filter((app) => app.date_sent && new Date(app.date_sent) >= weekStart).length,
    };
  }, [applications]);

  const pipelineMax = Math.max(1, ...COLUMNS.map((column) => applications.filter((app) => app.status === column.id).length));
  const recent = [...applications]
    .sort((a, b) => new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime())
    .slice(0, 5);

  const kpis = [
    ['Total candidatures', stats.total, '+12%', TrendingUp],
    ['Entretiens', stats.interviews, '+8%', Users],
    ['Réponses', stats.responses, '+6%', MessageSquareReply],
    ['Refus', stats.rejected, '-4%', TrendingDown],
    ['Taux réponse', `${stats.responseRate}%`, '+3%', BarChart3],
    ['Ce mois', stats.month, '+18%', CalendarClock],
    ['Cette semaine', stats.week, '+9%', CheckCircle2],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, delta, Icon]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
              </div>
              <div className="rounded-2xl bg-brand-500/10 p-2.5 text-cyan-200">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${String(delta).startsWith('-') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              {delta}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Progression pipeline</h3>
              <p className="text-sm text-slate-500">Répartition de vos candidatures par étape.</p>
            </div>
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-cyan-200">Live</span>
          </div>
          <div className="space-y-4">
            {COLUMNS.map((column) => {
              const count = applications.filter((app) => app.status === column.id).length;
              return (
                <div key={column.id}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-slate-300">{column.title}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-950/80">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-400" style={{ width: `${(count / pipelineMax) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Timeline récente</h3>
              <p className="text-sm text-slate-500">Dernières activités de votre recherche.</p>
            </div>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="font-display text-lg font-bold text-white">Aucune activité</p>
              <p className="mt-2 text-sm text-slate-500">Ajoutez une candidature pour alimenter votre timeline.</p>
              <button onClick={onCreate} className="mt-5 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500">
                Nouvelle candidature
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/35 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-200">{app.job_title || 'Poste sans titre'}</p>
                    <p className="text-xs text-slate-500">{app.company?.name || 'Entreprise inconnue'} · {app.status}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDistanceToNow(new Date(app.last_contact_date), { addSuffix: true, locale: fr })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
