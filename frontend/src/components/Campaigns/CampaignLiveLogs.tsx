import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../../lib/api';
import type { CampaignLog } from './types';

export function CampaignLiveLogs({ campaignId }: { campaignId: string | null }) {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLogs([]);
    if (!campaignId) return;

    let cancelled = false;
    const load = async () => {
      const res = await axios.get(`${API_BASE}/campaigns/${campaignId}/logs`);
      if (!cancelled) setLogs(res.data);
    };
    load();
    const timer = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [campaignId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const color = (level: CampaignLog['level']) => {
    if (level === 'success') return 'text-success';
    if (level === 'error') return 'text-danger';
    if (level === 'warning') return 'text-warning';
    return 'text-slate-300';
  };

  const sentCount = logs.filter((log) => log.level === 'success').length;
  const failedCount = logs.filter((log) => log.level === 'error').length;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#071014] shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.035] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">Console d'envoi</h3>
          <p className="mt-1 text-xs text-slate-600">Progression live, erreurs et confirmations Gmail.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">{sentCount} envoyés</span>
          <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">{failedCount} erreurs</span>
          <button onClick={() => setLogs([])} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-500 hover:text-white">Effacer</button>
        </div>
      </div>
      <div className="h-80 overflow-y-auto p-5 font-mono text-xs leading-6">
        {logs.length === 0 && <p className="text-slate-600">Aucun log pour le moment. Lancez un envoi pour voir la console se remplir.</p>}
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[5.5rem_4.5rem_1fr] gap-3 border-b border-white/[0.04] py-1.5">
            <span className="text-slate-600">{new Date(log.created_at).toLocaleTimeString()}</span>
            <span className={`font-bold uppercase ${color(log.level)}`}>{log.level}</span>
            <span className={color(log.level)}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
