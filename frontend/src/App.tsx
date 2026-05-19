import axios from 'axios';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FileText,
  Gauge,
  Grid3X3,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MailCheck,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Table2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { API_BASE } from './lib/api';
import { COLUMNS } from './types';
import type { Application, ApplicationStatus } from './types';
import { LandingPage } from './components/Landing/LandingPage';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { useAuth } from './contexts/AuthContext';
import { ApplicationCard } from './components/KanbanBoard/ApplicationCard';
import { KanbanBoard } from './components/KanbanBoard';
import { AddApplicationModal } from './components/Modals/AddApplicationModal';
import { ImportUrlModal } from './components/Modals/ImportUrlModal';
import { ExportButton } from './components/Export/ExportButton';
import { CandidatureSpontanee } from './components/Campaigns/CandidatureSpontanee';
import { DocumentLibrary } from './components/Documents/DocumentLibrary';
import { AnalyticsWidget } from './components/Analytics/AnalyticsWidget';
import { ApplicationTableView } from './components/Applications/ApplicationTableView';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';

type Page = 'dashboard' | 'pipeline' | 'table' | 'companies' | 'documents' | 'campaigns' | 'analytics' | 'settings';

const navigation: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'table', label: 'Tableau', icon: Table2 },
  { id: 'companies', label: 'Entreprises', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'campaigns', label: 'Campagnes', icon: BriefcaseBusiness },
  { id: 'analytics', label: 'Analytics', icon: Gauge },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<ApplicationStatus | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'with-source' | 'without-source'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ job_url?: string; raw_description?: string; company_name?: string; contract_type?: string; sector?: string; location?: string; salary?: string; description?: string; benefits?: string; job_title?: string; publication_date?: string; scraped_at?: string; remote_mode?: string } | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchApplications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/applications/`);
      setApplications(res.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchGmailStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/gmail/status`);
      setGmailConnected(res.data.connected);
      setGmailEmail(res.data.connected_email ?? null);
    } catch {
      setGmailConnected(false);
      setGmailEmail(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
      fetchGmailStatus();
    }
  }, [user]);

  const companies = useMemo(() => {
    return Array.from(new Set(applications.map((app) => app.company?.name).filter(Boolean) as string[])).sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return applications.filter((app) => {
      const term = globalSearch.trim().toLowerCase();
      if (term) {
        const haystack = [
          app.company?.name,
          app.job_title,
          app.type,
          app.status,
          app.location,
          app.company?.sector,
          ...(app.company?.tech_stack || []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (typeFilter !== 'all' && app.type !== typeFilter) return false;
      if (companyFilter !== 'all' && app.company?.name !== companyFilter) return false;
      if (sourceFilter === 'with-source' && !app.job_url) return false;
      if (sourceFilter === 'without-source' && app.job_url) return false;
      if (dateFilter !== 'all') {
        if (!app.date_sent) return false;
        const date = new Date(app.date_sent);
        if (dateFilter === 'week' && date < weekStart) return false;
        if (dateFilter === 'month' && date < monthStart) return false;
      }
      return true;
    });
  }, [applications, companyFilter, dateFilter, globalSearch, sourceFilter, statusFilter, typeFilter]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Chargement de votre session...</div>;
  }

  if (!user) {
    if (!showAuth) {
      return <LandingPage onLogin={() => { setAuthMode('login'); setShowAuth(true); }} />;
    }
    return (
      <div className="min-h-screen bg-slate-950">
        <button onClick={() => setShowAuth(false)} className="fixed left-5 top-5 z-50 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur hover:text-white">
          Retour à Telxia
        </button>
        {authMode === 'login' ? <LoginPage onRegister={() => setAuthMode('register')} /> : <RegisterPage onLogin={() => setAuthMode('login')} />}
      </div>
    );
  }

  const activeApplication = activeId ? applications.find((app) => app.id === activeId) : null;
  const currentNav = navigation.find((item) => item.id === page) || navigation[0];
  const avatar = user.full_name?.[0] || user.email[0] || 'T';

  const findContainer = (id: string) => {
    if (COLUMNS.some((col) => col.id === id)) return id as ApplicationStatus;
    return applications.find((app) => app.id === id)?.status;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    const app = applications.find((item) => item.id === id);
    if (app) setInitialStatus(app.status);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setApplications((prev) => {
      const activeIndex = prev.findIndex((item) => item.id === active.id);
      if (activeIndex === -1 || prev[activeIndex].status === overContainer) return prev;
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], status: overContainer };
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const currentActiveId = event.active.id as string;
    const currentInitialStatus = initialStatus;
    setActiveId(null);
    setInitialStatus(null);

    if (!event.over) {
      fetchApplications(true);
      return;
    }
    const overContainer = findContainer(event.over.id as string);
    const activeApp = applications.find((app) => app.id === currentActiveId);
    if (!activeApp || !overContainer) {
      fetchApplications(true);
      return;
    }
    if (overContainer !== currentInitialStatus) {
      try {
        await axios.put(`${API_BASE}/applications/${activeApp.id}`, {
          company_id: activeApp.company_id,
          status: overContainer,
        });
        fetchApplications(true);
      } catch {
        alert('Erreur de synchronisation. Rechargement du tableau...');
        fetchApplications();
      }
    } else if (currentActiveId !== event.over.id) {
      const activeIndex = applications.findIndex((app) => app.id === currentActiveId);
      const overIndex = applications.findIndex((app) => app.id === event.over?.id);
      if (activeIndex !== -1 && overIndex !== -1) {
        setApplications((items) => arrayMove(items, activeIndex, overIndex));
      }
    }
  };

  const handleImportSuccess = (data: { job_url: string; raw_description: string; company_name?: string; contract_type?: string; sector?: string; location?: string; salary?: string; description?: string; benefits?: string; job_title?: string; publication_date?: string; scraped_at?: string; remote_mode?: string }) => {
    setIsImportOpen(false);
    setInitialData(data);
    setIsAddOpen(true);
  };

  const renderMain = () => {
    if (page === 'dashboard') {
      return <DashboardOverview applications={filteredApplications} onCreate={() => { setInitialData(undefined); setIsAddOpen(true); }} />;
    }
    if (page === 'documents') return <DocumentLibrary />;
    if (page === 'campaigns') return <CandidatureSpontanee />;
    if (page === 'analytics') {
      return (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="premium-surface rounded-3xl p-6"><AnalyticsWidget applications={filteredApplications} /></section>
          <DashboardOverview applications={filteredApplications} onCreate={() => { setInitialData(undefined); setIsAddOpen(true); }} />
        </div>
      );
    }
    if (page === 'table') {
      return <ApplicationTableView applications={filteredApplications} onRefresh={() => fetchApplications(true)} />;
    }
    if (page === 'companies') {
      return <Placeholder title="Entreprises" text="Une vue dédiée entreprises arrive ici. Les données restent disponibles dans Pipeline et Tableau." icon={Building2} />;
    }
    if (page === 'settings') {
      return <SettingsPanel email={user.email} gmailConnected={gmailConnected} gmailEmail={gmailEmail} logout={logout} />;
    }
    return (
      <section className="premium-surface flex min-h-[680px] flex-col overflow-hidden rounded-3xl">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Pipeline candidatures</h2>
            <p className="text-sm text-slate-500">{filteredApplications.length} candidature(s) dans la vue actuelle.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton />
            <button onClick={() => setPage('table')} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
              <Table2 className="h-4 w-4" /> Vue tableau
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <LoadingState />
          ) : filteredApplications.length === 0 ? (
            <EmptyState onCreate={() => { setInitialData(undefined); setIsAddOpen(true); }} />
          ) : (
            <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div className="h-full"><KanbanBoard applications={filteredApplications} onRefresh={() => fetchApplications(true)} /></div>
              <DragOverlay dropAnimation={null}>
                {activeApplication ? (
                  <div className="scale-105 overflow-hidden rounded-xl shadow-2xl ring-2 ring-brand-500/20 rotate-1">
                    <ApplicationCard application={activeApplication} onRefresh={() => fetchApplications(true)} isOverlay />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1c22] text-slate-300">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(75,132,145,0.18),transparent_28rem),radial-gradient(circle_at_90%_10%,rgba(139,155,174,0.12),transparent_26rem)]" />
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#16252D]/95 p-4 backdrop-blur-2xl transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
              <img src="/logo-talexia.png" alt="Telxia" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Telxia</h1>
              <p className="text-xs font-semibold text-slate-500">Votre chemin vers la réussite.</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-all ${active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'}`}>
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3 inline-flex rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-cyan-200">
              Productivité
            </div>
            <p className="font-display text-sm font-bold text-white">Gardez le cap</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Centralisez vos candidatures, documents et relances dans un système clair.</p>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1c22]/82 backdrop-blur-2xl">
          <div className="flex min-h-20 items-center gap-4 px-4 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} className="rounded-2xl bg-white/[0.06] p-2 text-slate-300 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{currentNav.label}</p>
              <h2 className="font-display text-xl font-bold text-white">Bonjour, {user.full_name || user.email.split('@')[0]}</h2>
            </div>
            <div className="relative ml-0 flex-1 md:ml-8">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Recherche globale..." className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.055] pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500/50" />
            </div>
            <button className="hidden rounded-2xl bg-white/[0.055] p-3 text-slate-400 hover:text-white md:block" title="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <div className={`hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold md:flex ${gmailConnected ? 'bg-success/10 text-success' : 'bg-slate-800 text-slate-500'}`}>
              <MailCheck className="h-4 w-4" />
              {gmailConnected ? (gmailEmail || 'Gmail connecté') : 'Gmail déconnecté'}
            </div>
            <button onClick={() => { setInitialData(undefined); setIsAddOpen(true); }} className="hidden items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-brand-600/15 hover:bg-brand-500 xl:inline-flex">
              <Plus className="h-4 w-4" />
              Nouvelle candidature
            </button>
            <div className="relative">
              <button onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-2xl bg-white/[0.055] p-2 pr-3 hover:bg-white/[0.08]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">{avatar.toUpperCase()}</span>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-14 w-72 rounded-3xl border border-white/10 bg-[#16252D] p-3 shadow-2xl">
                  <div className="rounded-2xl bg-white/[0.045] p-3">
                    <p className="font-bold text-white">{user.full_name || 'Utilisateur Telxia'}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <p className="mt-2 truncate text-xs font-semibold text-cyan-200">{gmailConnected ? `Gmail : ${gmailEmail || 'connecté'}` : 'Gmail non connecté'}</p>
                  </div>
                  <button onClick={() => setPage('settings')} className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-slate-300 hover:bg-white/[0.05]">
                    <Settings className="h-4 w-4" /> Paramètres compte
                  </button>
                  <button onClick={logout} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/10">
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          {['dashboard', 'pipeline', 'table', 'analytics'].includes(page) && (
            <FilterBar
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              companyFilter={companyFilter}
              setCompanyFilter={setCompanyFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              companies={companies}
              count={filteredApplications.length}
              total={applications.length}
              onImport={() => setIsImportOpen(true)}
            />
          )}
          {renderMain()}
        </main>
      </div>

      {isAddOpen && <AddApplicationModal onClose={() => setIsAddOpen(false)} onSuccess={fetchApplications} initialData={initialData} />}
      {isImportOpen && <ImportUrlModal onClose={() => setIsImportOpen(false)} onSuccess={handleImportSuccess} />}
    </div>
  );
}

function FilterBar(props: {
  statusFilter: ApplicationStatus | 'all';
  setStatusFilter: (value: ApplicationStatus | 'all') => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  companyFilter: string;
  setCompanyFilter: (value: string) => void;
  sourceFilter: 'all' | 'with-source' | 'without-source';
  setSourceFilter: (value: 'all' | 'with-source' | 'without-source') => void;
  dateFilter: 'all' | 'week' | 'month';
  setDateFilter: (value: 'all' | 'week' | 'month') => void;
  companies: string[];
  count: number;
  total: number;
  onImport: () => void;
}) {
  const selectClass = 'rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm font-semibold text-slate-300 outline-none focus:border-brand-500/50';
  return (
    <section className="sticky top-20 z-10 mb-6 rounded-3xl border border-white/10 bg-[#16252D]/88 p-3 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value as ApplicationStatus | 'all')} className={selectClass}>
            <option value="all">Tous les statuts</option>
            {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.id}</option>)}
          </select>
          <select value={props.typeFilter} onChange={(event) => props.setTypeFilter(event.target.value)} className={selectClass}>
            <option value="all">Tous les contrats</option>
            {['Stage', 'Alternance', 'CDI', 'CDD', 'Freelance', 'Temps partiel', 'Temps plein', 'Interim'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={props.companyFilter} onChange={(event) => props.setCompanyFilter(event.target.value)} className={selectClass}>
            <option value="all">Toutes les entreprises</option>
            {props.companies.map((company) => <option key={company} value={company}>{company}</option>)}
          </select>
          <select value={props.sourceFilter} onChange={(event) => props.setSourceFilter(event.target.value as 'all' | 'with-source' | 'without-source')} className={selectClass}>
            <option value="all">Toutes sources</option>
            <option value="with-source">Avec source</option>
            <option value="without-source">Sans source</option>
          </select>
          <select value={props.dateFilter} onChange={(event) => props.setDateFilter(event.target.value as 'all' | 'week' | 'month')} className={selectClass}>
            <option value="all">Toutes dates</option>
            <option value="week">7 derniers jours</option>
            <option value="month">Ce mois</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-400">{props.count}/{props.total} résultats</span>
          <button onClick={props.onImport} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            <Sparkles className="h-4 w-4" />
            Importer URL
          </button>
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-2xl bg-brand-500/30" />
        <p className="font-semibold text-slate-500">Chargement de votre espace de travail...</p>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 rounded-[2rem] border border-dashed border-brand-500/30 bg-brand-500/10 p-8 text-cyan-200">
        <Grid3X3 className="h-12 w-12" />
      </div>
      <h3 className="font-display text-2xl font-bold text-white">Aucune candidature pour le moment</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Ajoutez votre première candidature ou importez une offre pour démarrer un pipeline clair.</p>
      <button onClick={onCreate} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500">
        <Plus className="h-4 w-4" />
        Nouvelle candidature
      </button>
    </div>
  );
}

function Placeholder({ title, text, icon: Icon }: { title: string; text: string; icon: typeof Building2 }) {
  return (
    <section className="premium-surface grid min-h-[520px] place-items-center rounded-3xl p-8 text-center">
      <div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-cyan-200">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="font-display text-3xl font-bold text-white">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </section>
  );
}

function SettingsPanel({ email, gmailConnected, gmailEmail, logout }: { email: string; gmailConnected: boolean; gmailEmail: string | null; logout: () => void }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="premium-surface rounded-3xl p-6">
        <h2 className="font-display text-2xl font-bold text-white">Paramètres compte</h2>
        <p className="mt-2 text-sm text-slate-500">Gérez votre profil, vos connexions et vos préférences Telxia.</p>
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Email connecté</p>
            <p className="mt-1 font-semibold text-white">{email}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gmail</p>
            <p className={`mt-1 font-semibold ${gmailConnected ? 'text-success' : 'text-slate-400'}`}>{gmailConnected ? (gmailEmail || 'Connecté') : 'Non connecté'}</p>
          </div>
        </div>
      </div>
      <div className="premium-surface rounded-3xl p-6">
        <h3 className="font-display text-xl font-bold text-white">Préférences</h3>
        <p className="mt-2 text-sm text-slate-500">Thème dark/light et notifications seront disponibles plus tard.</p>
        <button onClick={logout} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger hover:bg-danger/20">
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </section>
  );
}

export default App;
