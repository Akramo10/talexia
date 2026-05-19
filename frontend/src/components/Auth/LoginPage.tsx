import { useEffect, useRef, useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: string; size: string; width?: string }) => void;
        };
      };
    };
  }
}

export function LoginPage({ onRegister }: { onRegister: () => void }) {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const render = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setLoading(true);
          setError('');
          try {
            await googleLogin(response.credential);
          } catch {
            setError('Connexion Google impossible.');
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: '100%' });
    };

    if (window.google) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [googleClientId, googleLogin]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Connexion impossible. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Telxia</h1>
        <p className="text-sm text-slate-500 mt-1">Votre chemin vers la réussite.</p>
        <p className="text-sm text-slate-500 mt-1">Connectez-vous à votre espace candidatures.</p>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Email</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <input className="w-full bg-transparent py-3 outline-none text-slate-100" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Mot de passe</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <input className="w-full bg-transparent py-3 outline-none text-slate-100" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            Connexion
          </button>
        </div>
        <div className="mt-6 border-t border-slate-800 pt-6 space-y-3">
          {googleClientId ? <div ref={googleButtonRef} /> : (
            <p className="text-xs text-slate-500">Google Login sera disponible après configuration de VITE_GOOGLE_CLIENT_ID.</p>
          )}
        </div>
        <button type="button" onClick={onRegister} className="mt-6 w-full text-sm text-slate-400 hover:text-white">
          Créer un compte
        </button>
      </form>
    </div>
  );
}
