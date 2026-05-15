import { useEffect, useState } from 'react';
import type { Campaign } from './types';

export function CampaignProgressCard({ campaign }: { campaign: Campaign | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!campaign) {
    return (
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase text-slate-500">Progression</h3>
        <p className="text-sm text-slate-500 mt-4">Sélectionnez une campagne pour voir ses métriques.</p>
      </section>
    );
  }

  const total = campaign.total_recipients || campaign.recipients.length;
  const done = campaign.sent_count + campaign.failed_count + campaign.skipped_count;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const startedAt = campaign.started_at ? new Date(campaign.started_at).getTime() : null;
  const elapsedSeconds = startedAt ? Math.max((now - startedAt) / 1000, 1) : 0;
  const speed = startedAt ? campaign.sent_count / (elapsedSeconds / 60) : 0;
  const remaining = Math.max(campaign.pending_count, 0);
  const etaMinutes = speed > 0 ? Math.ceil(remaining / speed) : null;

  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase text-slate-500">Progression</h3>
        <span className="text-xs text-slate-400" title="Pourcentage des destinataires déjà traités">{percent}%</span>
      </div>
      <div className="mt-4 h-3 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <Metric label="Total" value={total} title="Nombre total de destinataires" />
        <Metric label="Envoyés" value={campaign.sent_count} title="Emails envoyés avec succès" />
        <Metric label="Échoués" value={campaign.failed_count} title="Failed = erreur pendant l'envoi" />
        <Metric label="Restants" value={campaign.pending_count} title="Pending = email pas encore envoyé" />
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Vitesse: {speed ? `${speed.toFixed(1)} email/min` : 'n/a'} · Temps restant: {etaMinutes !== null ? `${etaMinutes} min` : 'n/a'}
      </p>
    </section>
  );
}

function Metric({ label, value, title }: { label: string; value: number; title: string }) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3" title={title}>
      <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
