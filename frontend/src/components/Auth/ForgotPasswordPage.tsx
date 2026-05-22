import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ForgotPasswordPage({ onLogin }: { onLogin: () => void }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const responseMessage = await forgotPassword(email);
      setMessage(responseMessage);
      setCooldown(60);
    } catch {
      setError("Impossible d'envoyer la demande pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1c22] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16252D]/92 p-8 shadow-2xl shadow-black/20">
        <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Entrez votre email et nous vous enverrons un lien de réinitialisation si un compte existe.</p>
        <label className="mt-8 block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <input className="w-full bg-transparent py-3 text-slate-100 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
        </label>
        {message && (
          <div className="mt-4 rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
            <p>{message}</p>
            <p className="mt-1 text-xs text-slate-300">Le lien expire dans 30 minutes.</p>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <button disabled={loading || !email || cooldown > 0} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Envoyer le lien de réinitialisation'}
        </button>
        <button type="button" onClick={onLogin} className="mt-6 w-full text-sm text-slate-400 hover:text-white">
          Retour à la connexion
        </button>
      </form>
    </div>
  );
}
