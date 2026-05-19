import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await register(email, password, fullName);
    } catch {
      setError('Création impossible. Cet email existe peut-être déjà.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Créer un compte Telxia</h1>
        <p className="text-sm text-slate-500 mt-1">Votre chemin vers la réussite.</p>
        <div className="mt-8 space-y-4">
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-slate-100" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-slate-100" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-slate-100" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            Inscription
          </button>
        </div>
        <button type="button" onClick={onLogin} className="mt-6 w-full text-sm text-slate-400 hover:text-white">
          Déjà un compte
        </button>
      </form>
    </div>
  );
}
