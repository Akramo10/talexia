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

  return (
    <section className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase text-slate-500">Terminal logs</h3>
        <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-white">Effacer l'affichage</button>
      </div>
      <div className="h-64 overflow-y-auto font-mono text-xs space-y-2">
        {logs.length === 0 && <p className="text-slate-600">Aucun log pour le moment.</p>}
        {logs.map((log) => (
          <p key={log.id} className={color(log.level)}>
            [{new Date(log.created_at).toLocaleTimeString()}] {log.message}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
