import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isInvalid = !email || password.length < 8 || !confirmPassword || password !== confirmPassword || loading;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, confirmPassword, fullName);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Création impossible. Cet email existe peut-être déjà.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1c22] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16252D]/92 p-8 shadow-2xl shadow-black/20">
        <h1 className="text-2xl font-bold text-white">Créer un compte Telxia</h1>
        <p className="text-sm text-slate-400 mt-1">Votre chemin vers la réussite.</p>
        <div className="mt-8 space-y-4">
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {passwordTooShort && <p className="text-sm text-warning">Minimum recommandé : 8 caractères.</p>}
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required minLength={8} />
          {passwordsMismatch && <p className="text-sm text-danger">Les mots de passe ne correspondent pas.</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={isInvalid} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Création...' : 'Inscription'}
          </button>
        </div>
        <button type="button" onClick={onLogin} className="mt-6 w-full text-sm text-slate-400 hover:text-white">
          Déjà un compte
        </button>
      </form>
    </div>
  );
}
