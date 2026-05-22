import { useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PHONE_COUNTRIES = [
  { code: 'FR', label: 'France', dialCode: '+33', placeholder: '6 12 34 56 78' },
  { code: 'TN', label: 'Tunisie', dialCode: '+216', placeholder: '20 123 456' },
  { code: 'DZ', label: 'Algérie', dialCode: '+213', placeholder: '5 12 34 56 78' },
  { code: 'MA', label: 'Maroc', dialCode: '+212', placeholder: '6 12 34 56 78' },
  { code: 'ES', label: 'Espagne', dialCode: '+34', placeholder: '612 34 56 78' },
  { code: 'BE', label: 'Belgique', dialCode: '+32', placeholder: '470 12 34 56' },
  { code: 'CH', label: 'Suisse', dialCode: '+41', placeholder: '78 123 45 67' },
  { code: 'SN', label: 'Sénégal', dialCode: '+221', placeholder: '77 123 45 67' },
  { code: 'CI', label: "Côte d'Ivoire", dialCode: '+225', placeholder: '07 01 02 03 04' },
  { code: 'CM', label: 'Cameroun', dialCode: '+237', placeholder: '6 12 34 56 78' },
] as const;

function detectPhoneCountryCode() {
  const localeCountry = navigator.language.split('-')[1]?.toUpperCase();
  if (PHONE_COUNTRIES.some((country) => country.code === localeCountry)) return localeCountry;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneMap: Record<string, string> = {
    'Europe/Paris': 'FR',
    'Europe/Madrid': 'ES',
    'Africa/Tunis': 'TN',
    'Africa/Algiers': 'DZ',
    'Africa/Casablanca': 'MA',
    'Europe/Brussels': 'BE',
    'Europe/Zurich': 'CH',
    'Africa/Dakar': 'SN',
    'Africa/Abidjan': 'CI',
    'Africa/Douala': 'CM',
  };
  return timeZoneMap[timeZone] || 'FR';
}

function buildInternationalPhone(dialCode: string, nationalPhone: string) {
  const trimmed = nationalPhone.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  return `${dialCode} ${trimmed}`;
}

const PLAN_LABELS: Record<string, string> = {
  trial_3_months: 'Offre 3 mois gratuits',
  six_months: 'Offre 6 mois - 30 EUR',
  twelve_months: 'Offre 12 mois - 50 EUR',
};

export function RegisterPage({ onLogin, selectedPlan = 'trial_3_months' }: { onLogin: () => void; selectedPlan?: string }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(() => detectPhoneCountryCode());
  const [nationalPhone, setNationalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPhoneCountry = useMemo(
    () => PHONE_COUNTRIES.find((country) => country.code === phoneCountryCode) || PHONE_COUNTRIES[0],
    [phoneCountryCode],
  );
  const phone = buildInternationalPhone(selectedPhoneCountry.dialCode, nationalPhone);
  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const phoneInvalid = phone.length > 0 && !/^\+?[0-9\s().-]{7,20}$/.test(phone);
  const isInvalid = !email || phoneInvalid || password.length < 8 || !confirmPassword || password !== confirmPassword || loading;

  const handlePhoneChange = (value: string) => {
    const trimmed = value.trimStart();
    if (trimmed.startsWith('+')) {
      const detectedCountry = PHONE_COUNTRIES
        .filter((country) => trimmed.startsWith(country.dialCode))
        .sort((a, b) => b.dialCode.length - a.dialCode.length)[0];

      if (detectedCountry) {
        setPhoneCountryCode(detectedCountry.code);
        setNationalPhone(trimmed.slice(detectedCountry.dialCode.length).trimStart());
        return;
      }
    }
    setNationalPhone(value);
  };

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
      await register(email, password, confirmPassword, fullName, phone, selectedPlan);
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : null;
      setError(detail || 'Création impossible. Cet email existe peut-être déjà.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1c22] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16252D]/92 p-8 shadow-2xl shadow-black/20">
        <h1 className="text-2xl font-bold text-white">Créer un compte Telxia</h1>
        <p className="text-sm text-slate-400 mt-1">Votre chemin vers la réussite.</p>
        <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">
          {PLAN_LABELS[selectedPlan] || PLAN_LABELS.trial_3_months}
        </p>
        <div className="mt-8 space-y-4">
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-slate-100 outline-none focus:border-brand-500/60" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 focus-within:border-brand-500/60">
            <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-slate-500">Téléphone optionnel</label>
            <div className="flex gap-2">
              <select
                className="w-36 rounded-lg border border-white/10 bg-[#16252D] px-2 text-sm font-semibold text-slate-100 outline-none"
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                aria-label="Pays du numéro de téléphone"
              >
                {PHONE_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label} {country.dialCode}
                  </option>
                ))}
              </select>
              <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-slate-950/50">
                <span className="border-r border-white/10 px-3 text-sm font-bold text-cyan-200">{selectedPhoneCountry.dialCode}</span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-slate-100 outline-none"
                  placeholder={selectedPhoneCountry.placeholder}
                  value={nationalPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  type="tel"
                />
              </div>
            </div>
          </div>
          {phoneInvalid && <p className="text-sm text-warning">Format téléphone invalide. Exemple : {selectedPhoneCountry.dialCode} {selectedPhoneCountry.placeholder}.</p>}
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
