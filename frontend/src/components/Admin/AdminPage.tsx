import axios from 'axios';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Ban,
  CheckCircle2,
  Crown,
  Database,
  Gift,
  History,
  Loader2,
  MailCheck,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Sparkles,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../../lib/api';
import type { UserSubscription } from '../../contexts/AuthContext';

type AdminSection = 'dashboard' | 'users' | 'subscriptions';

interface AdminStats {
  total_users: number;
  active_users_today: number;
  new_users_this_week: number;
  total_applications: number;
  email_campaigns_sent: number;
  emails_sent_today: number;
  future_open_rate: number | null;
  s3_storage_used_mb: number;
  estimated_revenue_eur: string;
  active_trials: number;
  expired_subscriptions: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: 'active' | 'suspended';
  gmail_connected: boolean;
  created_at: string;
  last_activity: string | null;
  subscription: UserSubscription | null;
}

interface AdminSubscription extends UserSubscription {
  user_email: string;
  user_name: string | null;
}

interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price_eur: string;
  is_active: boolean;
}

interface UserStats {
  applications_count: number;
  documents_count: number;
  campaigns_count: number;
  emails_sent_count: number;
  gmail_connected: boolean;
  last_activity: string | null;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

function sectionFromPath(): AdminSection {
  if (window.location.pathname.startsWith('/admin/users')) return 'users';
  if (window.location.pathname.startsWith('/admin/subscriptions')) return 'subscriptions';
  return 'dashboard';
}

function navigateAdmin(section: AdminSection) {
  const path = section === 'dashboard' ? '/admin' : `/admin/${section}`;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function daysRemaining(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

function statusBadge(status: string) {
  if (status === 'active') return 'bg-emerald-400/15 text-emerald-300';
  if (status === 'trial') return 'bg-cyan-400/15 text-cyan-200';
  if (status === 'expired' || status === 'suspended') return 'bg-danger/15 text-danger';
  if (status === 'cancelled') return 'bg-slate-500/15 text-slate-300';
  return 'bg-slate-700 text-slate-200';
}

export function AdminPage({ onExit }: { onExit: () => void }) {
  const [section, setSection] = useState<AdminSection>(() => sectionFromPath());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, subscriptionsRes, plansRes] = await Promise.all([
        axios.get<AdminStats>(`${API_BASE}/admin/stats`),
        axios.get<AdminUser[]>(`${API_BASE}/admin/users`),
        axios.get<AdminSubscription[]>(`${API_BASE}/admin/subscriptions`),
        axios.get<Plan[]>(`${API_BASE}/subscriptions/plans`),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setSubscriptions(subscriptionsRes.data);
      setPlans(plansRes.data);
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : null;
      setToast({ type: 'error', message: detail || 'Impossible de charger l’espace admin.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncPath = () => setSection(sectionFromPath());
    window.addEventListener('popstate', syncPath);
    load();
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  const runAction = async (label: string, action: () => Promise<void>) => {
    try {
      await action();
      setToast({ type: 'success', message: label });
      await load();
    } catch (err: unknown) {
      const detail = axios.isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : null;
      setToast({ type: 'error', message: detail || 'Action impossible.' });
    }
  };

  const nav = [
    { id: 'dashboard' as const, label: 'Dashboard Admin', icon: BarChart3 },
    { id: 'users' as const, label: 'Utilisateurs', icon: Users },
    { id: 'subscriptions' as const, label: 'Abonnements', icon: WalletCards },
  ];

  return (
    <div className="min-h-screen bg-[#0f1c22] text-slate-200">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-[#16252D] p-5 lg:block">
        <div className="flex items-center gap-3">
          <img src="/logo-talexia.png" alt="Telxia" className="h-12 w-12 rounded-2xl object-contain" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Telxia Admin</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8BA5AD]">SaaS control center</p>
          </div>
        </div>
        <nav className="mt-8 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateAdmin(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${active ? 'bg-[#4B8491] text-white shadow-xl shadow-[#4B8491]/20' : 'text-[#C2D1D5] hover:bg-white/[0.06] hover:text-white'}`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </nav>
        <button onClick={onExit} className="mt-8 flex w-full items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-[#C2D1D5] hover:bg-white/[0.06]">
          <ArrowLeft className="h-4 w-4" /> Retour espace candidat
        </button>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1c22]/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8BA5AD]">Administration Telxia</p>
              <h2 className="font-display text-2xl font-bold text-white">{nav.find((item) => item.id === section)?.label}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/[0.1]">
                <RefreshCw className="h-4 w-4" /> Rafraîchir
              </button>
              <button onClick={onExit} className="inline-flex items-center gap-2 rounded-2xl bg-[#4B8491] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3f7481] lg:hidden">
                <ArrowLeft className="h-4 w-4" /> Sortir
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          {toast && (
            <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-danger/20 bg-danger/10 text-danger'}`}>
              {toast.message}
            </div>
          )}
          {loading ? (
            <div className="grid min-h-[520px] place-items-center rounded-3xl border border-white/10 bg-white/[0.045]">
              <div className="flex items-center gap-3 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Chargement admin...</div>
            </div>
          ) : (
            <>
              {section === 'dashboard' && <AdminDashboard stats={stats} />}
              {section === 'users' && <AdminUsers users={users} plans={plans} runAction={runAction} />}
              {section === 'subscriptions' && <AdminSubscriptions subscriptions={subscriptions} plans={plans} runAction={runAction} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard({ stats }: { stats: AdminStats | null }) {
  const kpis: Array<[string, string | number, LucideIcon]> = [
    ['Utilisateurs', stats?.total_users ?? 0, Users],
    ['Actifs aujourd’hui', stats?.active_users_today ?? 0, Activity],
    ['Nouveaux cette semaine', stats?.new_users_this_week ?? 0, Sparkles],
    ['Candidatures', stats?.total_applications ?? 0, Database],
    ['Campagnes envoyées', stats?.email_campaigns_sent ?? 0, MailCheck],
    ['Emails aujourd’hui', stats?.emails_sent_today ?? 0, MailCheck],
    ['Taux ouverture', stats?.future_open_rate == null ? 'Bientôt' : `${stats.future_open_rate}%`, BarChart3],
    ['Stockage S3', `${stats?.s3_storage_used_mb ?? 0} MB`, Database],
    ['Revenus estimés', `${Number(stats?.estimated_revenue_eur || 0).toLocaleString('fr-FR')} €`, WalletCards],
    ['Trials actifs', stats?.active_trials ?? 0, Crown],
    ['Expirés', stats?.expired_subscriptions ?? 0, Ban],
  ];
  const growthBars = [42, 54, 46, 68, 61, 74, 88];
  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {kpis.map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/10">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#4B8491]/15 text-cyan-200">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8BA5AD]">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <h3 className="font-display text-xl font-bold text-white">Croissance utilisateurs</h3>
          <div className="mt-8 flex h-48 items-end gap-3">
            {growthBars.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-2xl bg-gradient-to-t from-[#4B8491] to-[#C2D1D5]" style={{ height: `${height}%` }} />
                <span className="text-xs font-bold text-slate-500">J-{6 - index}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <h3 className="font-display text-xl font-bold text-white">Heatmap activité</h3>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className={`aspect-square rounded-lg ${index % 5 === 0 ? 'bg-[#C2D1D5]' : index % 3 === 0 ? 'bg-[#4B8491]' : 'bg-white/[0.08]'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminUsers({ users, plans, runAction }: { users: AdminUser[]; plans: Plan[]; runAction: (label: string, action: () => Promise<void>) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => users.filter((user) => {
    const term = search.toLowerCase().trim();
    if (term && ![user.full_name, user.email, user.phone].filter(Boolean).join(' ').toLowerCase().includes(term)) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (planFilter !== 'all' && user.subscription?.plan.name !== planFilter) return false;
    return true;
  }), [planFilter, search, statusFilter, users]);

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const trialPlan = plans.find((plan) => plan.name.toLowerCase().includes('trial')) || plans[0];
  const premiumPlan = plans.find((plan) => plan.duration_months === 12) || plans[plans.length - 1];

  const confirmRun = (message: string, label: string, action: () => Promise<void>) => {
    if (window.confirm(message)) runAction(label, action);
  };

  const showStats = async (user: AdminUser) => {
    const res = await axios.get<UserStats>(`${API_BASE}/admin/users/${user.id}/stats`);
    window.alert(`Stats ${user.email}\nCandidatures: ${res.data.applications_count}\nDocuments: ${res.data.documents_count}\nCampagnes: ${res.data.campaigns_count}\nEmails envoyés: ${res.data.emails_sent_count}\nGmail: ${res.data.gmail_connected ? 'connecté' : 'non connecté'}`);
  };

  return (
    <section className="space-y-4">
      <AdminFilters search={search} setSearch={setSearch}>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
          <option value="all">Tous statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
          <option value="all">Tous plans</option>
          {plans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
        </select>
      </AdminFilters>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1280px] w-full text-left">
            <thead className="sticky top-0 z-10 bg-slate-950/95 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {['Nom', 'Email', 'Téléphone', 'Plan', 'Statut', 'Gmail', 'Inscription', 'Dernière activité', 'Actions'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-semibold text-white">{user.full_name || 'Utilisateur Telxia'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{user.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{user.subscription?.plan.name || '-'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(user.status)}`}>{user.status}</span></td>
                  <td className="px-4 py-3 text-sm">{user.gmail_connected ? 'Connecté' : '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(user.last_activity)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <IconButton title="Stats" onClick={() => showStats(user)} icon={<BarChart3 className="h-4 w-4" />} />
                      {user.is_active ? <IconButton title="Suspendre" onClick={() => confirmRun(`Suspendre ${user.email} ?`, 'Utilisateur suspendu.', () => axios.put(`${API_BASE}/admin/users/${user.id}/suspend`))} icon={<Ban className="h-4 w-4" />} /> : <IconButton title="Réactiver" onClick={() => runAction('Utilisateur réactivé.', () => axios.put(`${API_BASE}/admin/users/${user.id}/reactivate`))} icon={<CheckCircle2 className="h-4 w-4" />} />}
                      {user.is_admin ? <IconButton title="Retirer admin" onClick={() => confirmRun(`Retirer les droits admin de ${user.email} ?`, 'Droits admin retirés.', () => axios.put(`${API_BASE}/admin/users/${user.id}/remove-admin`))} icon={<ShieldOff className="h-4 w-4" />} /> : <IconButton title="Rendre admin" onClick={() => confirmRun(`Rendre ${user.email} admin ?`, 'Utilisateur rendu admin.', () => axios.put(`${API_BASE}/admin/users/${user.id}/make-admin`))} icon={<Shield className="h-4 w-4" />} />}
                      {trialPlan && <IconButton title="Reset abonnement" onClick={() => confirmRun(`Réinitialiser l’abonnement de ${user.email} ?`, 'Abonnement réinitialisé.', () => axios.put(`${API_BASE}/admin/users/${user.id}/subscription`, { plan_id: trialPlan.id, status: 'trial' }))} icon={<RefreshCw className="h-4 w-4" />} />}
                      {premiumPlan && <IconButton title="Premium" onClick={() => confirmRun(`Donner accès premium à ${user.email} ?`, 'Accès premium accordé.', () => axios.put(`${API_BASE}/admin/users/${user.id}/subscription`, { plan_id: premiumPlan.id, status: 'active' }))} icon={<Crown className="h-4 w-4" />} />}
                      <IconButton danger title="Supprimer" onClick={() => confirmRun(`Supprimer définitivement ${user.email} ?`, 'Utilisateur supprimé.', () => axios.delete(`${API_BASE}/admin/users/${user.id}`))} icon={<Trash2 className="h-4 w-4" />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} />
    </section>
  );
}

function AdminSubscriptions({ subscriptions, plans, runAction }: { subscriptions: AdminSubscription[]; plans: Plan[]; runAction: (label: string, action: () => Promise<void>) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const filtered = useMemo(() => subscriptions.filter((subscription) => {
    const term = search.toLowerCase().trim();
    if (term && ![subscription.user_name, subscription.user_email, subscription.plan.name].filter(Boolean).join(' ').toLowerCase().includes(term)) return false;
    if (statusFilter !== 'all' && subscription.status !== statusFilter) return false;
    return true;
  }), [search, statusFilter, subscriptions]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const extend = (subscription: AdminSubscription) => {
    const months = Number(window.prompt('Nombre de mois à ajouter ?', '1'));
    if (!months) return;
    runAction('Abonnement prolongé.', () => axios.put(`${API_BASE}/admin/subscriptions/${subscription.id}/extend`, { months }));
  };
  const gift = (subscription: AdminSubscription) => {
    const months = Number(window.prompt('Mois gratuits à offrir ?', '1'));
    if (!months) return;
    runAction('Mois gratuits offerts.', () => axios.put(`${API_BASE}/admin/subscriptions/${subscription.id}/gift-months`, { months }));
  };
  const changePlan = (subscription: AdminSubscription) => {
    const planLabel = plans.map((plan, index) => `${index + 1}. ${plan.name}`).join('\n');
    const choice = Number(window.prompt(`Choisir un plan:\n${planLabel}`, '1'));
    const plan = plans[choice - 1];
    if (!plan) return;
    runAction('Plan modifié.', () => axios.put(`${API_BASE}/admin/subscriptions/${subscription.id}/change-plan`, { plan_id: plan.id, reset_dates: true }));
  };
  const showHistory = async (subscription: AdminSubscription) => {
    const res = await axios.get<Array<{ action: string; old_value: string | null; new_value: string | null; created_at: string }>>(`${API_BASE}/admin/subscriptions/${subscription.id}/history`);
    const lines = res.data.map((item) => `${formatDate(item.created_at)} - ${item.action}: ${item.old_value || '-'} -> ${item.new_value || '-'}`);
    window.alert(lines.length ? lines.join('\n') : 'Aucun historique pour cet abonnement.');
  };

  return (
    <section className="space-y-4">
      <AdminFilters search={search} setSearch={setSearch}>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
          <option value="all">Tous statuts</option>
          <option value="trial">Trial</option>
          <option value="active">Actif</option>
          <option value="expired">Expiré</option>
          <option value="cancelled">Annulé</option>
        </select>
      </AdminFilters>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1120px] w-full text-left">
            <thead className="sticky top-0 z-10 bg-slate-950/95 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {['Utilisateur', 'Email', 'Plan', 'Statut', 'Début', 'Fin', 'Jours restants', 'Prix', 'Actions'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-semibold text-white">{subscription.user_name || 'Utilisateur Telxia'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{subscription.user_email}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{subscription.plan.name}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(subscription.status)}`}>{subscription.status}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(subscription.starts_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(subscription.ends_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{daysRemaining(subscription.ends_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{Number(subscription.plan.price_eur).toLocaleString('fr-FR')} €</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <IconButton title="Prolonger" onClick={() => extend(subscription)} icon={<RefreshCw className="h-4 w-4" />} />
                      <IconButton title="Changer plan" onClick={() => changePlan(subscription)} icon={<WalletCards className="h-4 w-4" />} />
                      <IconButton title="Offrir mois" onClick={() => gift(subscription)} icon={<Gift className="h-4 w-4" />} />
                      <IconButton title="Historique" onClick={() => showHistory(subscription)} icon={<History className="h-4 w-4" />} />
                      <IconButton title="Paiements futurs" onClick={() => window.alert('Paiements futurs: placeholder en attente intégration paiement.')} icon={<Sparkles className="h-4 w-4" />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} />
    </section>
  );
}

function AdminFilters({ search, setSearch, children }: { search: string; setSearch: (value: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative w-full xl:max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-11 pr-4 text-sm text-white outline-none focus:border-[#4B8491]" />
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function IconButton({ title, icon, onClick, danger }: { title: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={`rounded-xl p-2 ${danger ? 'text-slate-500 hover:bg-danger/10 hover:text-danger' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
      {icon}
    </button>
  );
}

function Pagination({ page, totalPages, total, setPage }: { page: number; totalPages: number; total: number; setPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs text-slate-500">
      <span>{total} résultat(s) · page {page}/{totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} className="rounded-xl bg-slate-800 px-3 py-2 font-bold text-slate-300 disabled:opacity-40">Précédent</button>
        <button disabled={page === totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))} className="rounded-xl bg-slate-800 px-3 py-2 font-bold text-slate-300 disabled:opacity-40">Suivant</button>
      </div>
    </div>
  );
}
