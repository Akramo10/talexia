import { useMemo, useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ResetPasswordPage({ onLogin }: { onLogin: () => void }) {
  const { resetPassword } = useAuth();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isInvalid = !token || password.length < 8 || !confirmPassword || password !== confirmPassword || loading;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const responseMessage = await resetPassword(token, password, confirmPassword);
      setMessage(responseMessage);
      window.history.replaceState({}, '', '/');
      setTimeout(onLogin, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1c22] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16252D]/92 p-8 shadow-2xl shadow-black/20">
        <h1 className="text-2xl font-bold text-white">Réinitialiser le mot de passe</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Choisissez un nouveau mot de passe pour votre compte Telxia.</p>
        {!token && <p className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">Token de réinitialisation manquant.</p>}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            <input className="w-full bg-transparent py-3 text-slate-100 outline-none" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            <input className="w-full bg-transparent py-3 text-slate-100 outline-none" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required minLength={8} />
          </div>
          {password.length > 0 && password.length < 8 && <p className="text-sm text-warning">Minimum recommandé : 8 caractères.</p>}
          {passwordsMismatch && <p className="text-sm text-danger">Les mots de passe ne correspondent pas.</p>}
          {message && <p className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={isInvalid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            Réinitialiser
          </button>
        </div>
        <button type="button" onClick={onLogin} className="mt-6 w-full text-sm text-slate-400 hover:text-white">
          Retour à la connexion
        </button>
      </form>
    </div>
  );
}
