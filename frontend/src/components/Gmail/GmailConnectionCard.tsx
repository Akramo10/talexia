import axios from 'axios';
import { LogOut, MailCheck, RefreshCw, Wifi } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../../lib/api';

interface GmailConnectionCardProps {
  connected: boolean;
  email: string | null;
  compact?: boolean;
  onStatusChange: (connected: boolean, email: string | null) => void;
  onMessage?: (message: string) => void;
}

export function GmailConnectionCard({ connected, email, compact = false, onStatusChange, onMessage }: GmailConnectionCardProps) {
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/gmail/status`, { headers: { 'Cache-Control': 'no-cache' } });
      onStatusChange(Boolean(res.data.connected), res.data.connected_email ?? null);
    } catch {
      onStatusChange(false, null);
      if (!silent) onMessage?.('Impossible de rafraichir le statut Gmail.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onMessage, onStatusChange]);

  useEffect(() => {
    refreshStatus(true);

    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get('gmail');
    if (gmailResult) {
      refreshStatus(false);
      params.delete('gmail');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
      onMessage?.(gmailResult === 'connected' ? 'Gmail connecte avec succes.' : 'Connexion Gmail impossible.');
    }

    const onFocus = () => refreshStatus(true);
    const onVisibility = () => {
      if (!document.hidden) refreshStatus(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onMessage, refreshStatus]);

  const connectGmail = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/gmail/connect`);
      window.location.href = res.data.authorization_url;
    } catch (error) {
      setLoading(false);
      const detail = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : null;
      onMessage?.(detail || 'Connexion Gmail impossible. Verifiez la configuration OAuth.');
    }
  };

  const disconnectGmail = async () => {
    if (!window.confirm('Deconnecter Gmail pour votre compte Telxia ?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/gmail/disconnect`);
      onStatusChange(false, null);
      onMessage?.('Gmail deconnecte pour votre compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-3xl border p-4 ${connected ? 'border-success/25 bg-success/10' : 'border-warning/25 bg-warning/10'} ${compact ? 'min-w-[280px]' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${connected ? 'bg-success text-white' : 'bg-warning text-slate-950'}`}>
            {connected ? <MailCheck className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
          </span>
          <div>
            <p className={`text-sm font-black ${connected ? 'text-success' : 'text-warning'}`}>
              {connected ? 'Gmail connecte' : 'Gmail non connecte'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{connected ? (email || 'Email Gmail en cours de synchronisation') : 'Aucun compte Gmail lie'}</p>
            <p className="mt-1 text-xs text-slate-500">
              Statut connexion : {connected ? 'actif pour votre utilisateur Telxia uniquement' : 'connexion requise avant envoi'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <button type="button" onClick={disconnectGmail} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-60">
                <LogOut className="h-4 w-4" />
                Deconnecter Gmail
              </button>
              <button type="button" onClick={connectGmail} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reconnecter
              </button>
            </>
          ) : (
            <button type="button" onClick={connectGmail} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60">
              <Wifi className="h-4 w-4" />
              Connecter Gmail
            </button>
          )}
          <button type="button" onClick={() => refreshStatus(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.09] disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>
    </div>
  );
}
