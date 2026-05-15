import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { AnalyticsWidget } from './components/Analytics/AnalyticsWidget';
import { TechFilter } from './components/SearchFilter/TechFilter';
import { COLUMNS } from './types';
import type { Application, ApplicationStatus } from './types';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { ApplicationCard } from './components/KanbanBoard/ApplicationCard';
import { AddApplicationModal } from './components/Modals/AddApplicationModal';
import { ImportUrlModal } from './components/Modals/ImportUrlModal';
import { ExportButton } from './components/Export/ExportButton';
import { API_BASE } from './lib/api';
import { CandidatureSpontanee } from './components/Campaigns/CandidatureSpontanee';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [page, setPage] = useState<'dashboard' | 'spontanee'>('dashboard');
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ job_url?: string; raw_description?: string; company_name?: string; contract_type?: string; sector?: string; location?: string; salary?: string; description?: string; benefits?: string; job_title?: string } | undefined>();

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
      console.error("Error fetching applications:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Chargement de votre session...
      </div>
    );
  }

  if (!user) {
    return authMode === 'login'
      ? <LoginPage onRegister={() => setAuthMode('register')} />
      : <RegisterPage onLogin={() => setAuthMode('login')} />;
  }

  const findContainer = (id: string) => {
    if (COLUMNS.some(col => col.id === id)) return id as ApplicationStatus;
    return applications.find(app => app.id === id)?.status;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    const app = applications.find(a => a.id === id);
    if (app) setInitialStatus(app.status);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setApplications((prev) => {
      const activeIndex = prev.findIndex(i => i.id === activeId);
      if (activeIndex === -1) return prev;
      
      if (prev[activeIndex].status === overContainer) return prev;

      const newItems = [...prev];
      newItems[activeIndex] = { ...newItems[activeIndex], status: overContainer };
      return newItems;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentActiveId = active.id as string;
    const currentInitialStatus = initialStatus;
    
    setActiveId(null);
    setInitialStatus(null);
    
    if (!over) {
      // If dropped outside, we might need to revert if optimistically moved
      fetchApplications(true);
      return;
    }

    const overId = over.id as string;
    const overContainer = findContainer(overId);
    const activeApp = applications.find(app => app.id === currentActiveId);

    if (!activeApp || !overContainer) {
      fetchApplications(true);
      return;
    }

    // Persist status change if occurred
    if (overContainer !== currentInitialStatus) {
      try {
        await axios.put(`${API_BASE}/applications/${activeApp.id}`, {
          company_id: activeApp.company_id,
          status: overContainer,
        });
        // Silent success refresh
        fetchApplications(true);
      } catch (error) {
        console.error("Failed to update status on server:", error);
        alert("Erreur de synchronisation. Rechargement du tableau...");
        fetchApplications();
      }
    } else {
      // Potential reorder within the same column (purely visual for now as index isn't persisted)
      const overAppId = overId;
      if (currentActiveId !== overAppId) {
        const activeIndex = applications.findIndex(a => a.id === currentActiveId);
        const overIndex = applications.findIndex(a => a.id === overAppId);
        if (activeIndex !== -1 && overIndex !== -1) {
          setApplications((items) => arrayMove(items, activeIndex, overIndex));
        }
      }
    }
  };

  const filteredApplications = applications.filter(app => {
    // 1. Filter by Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const companyNameMatch = app.company?.name.toLowerCase().includes(term);
      const techMatch = app.company?.tech_stack?.some(tech => tech.toLowerCase().includes(term));
      if (!companyNameMatch && !techMatch) return false;
    }
    
    // 2. Filter by Type (Stage / Alternance)
    if (filterType !== 'all' && app.type !== filterType) {
      return false;
    }
    
    return true;
  });

  const activeApplication = activeId ? applications.find(app => app.id === activeId) : null;

  const handleImportSuccess = (data: { job_url: string; raw_description: string; company_name?: string; contract_type?: string; sector?: string; location?: string; salary?: string; description?: string; benefits?: string; job_title?: string }) => {
    setIsImportOpen(false);
    setInitialData(data);
    setIsAddOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-[1600px] flex flex-col flex-1">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-slate-800 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                PathFinder <span className="text-slate-500 font-medium text-lg ml-1">Dashboard</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
            <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setPage('dashboard')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${page === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage('spontanee')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${page === 'spontanee' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Candidature spontanée
              </button>
              <button
                onClick={logout}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Déconnexion
              </button>
            </div>

            {page === 'dashboard' && <TechFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} />}
            
            {page === 'dashboard' && <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>}
            
            {page === 'dashboard' && <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setFilterType('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Tout
              </button>
              <button 
                onClick={() => setFilterType('Alternance')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'Alternance' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Alternance
              </button>
              <button 
                onClick={() => setFilterType('Stage')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'Stage' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Stage
              </button>
            </div>}
          </div>
        </header>

        {page === 'spontanee' ? (
          <CandidatureSpontanee />
        ) : (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
          <aside className="lg:col-span-3 flex flex-col gap-6">
            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <AnalyticsWidget applications={applications} />
            </section>

            <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col flex-1">
              <h3 className="text-slate-400 font-bold text-[10px] tracking-[0.1em] uppercase mb-6">Actions Rapides</h3>
              <div className="space-y-3">
                <button
                  onClick={() => { setInitialData(undefined); setIsAddOpen(true); }}
                  className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white transition-all font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 group"
                >
                  <span className="text-lg">+</span>
                  <span>Nouvelle Candidature</span>
                </button>
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all font-semibold border border-slate-700 rounded-xl flex items-center justify-center gap-2"
                >
                  <span>Importer via URL</span>
                </button>
              </div>
            </section>
          </aside>

          <section className="lg:col-span-9 bg-slate-900/30 border border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-[700px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Suivi Kanban</h2>
              </div>
              <div className="flex items-center gap-3">
                <ExportButton />
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{filteredApplications.length} Candidatures</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-medium">
                  Chargement de votre espace de travail...
                </div>
              ) : (
                <DndContext
                  sensors={sensors} collisionDetection={rectIntersection}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
                >
                  <div className="h-full">
                    <KanbanBoard applications={filteredApplications} onRefresh={fetchApplications} />
                  </div>
                  <DragOverlay dropAnimation={null}>
                    {activeApplication ? (
                      <div className="scale-105 shadow-2xl ring-2 ring-brand-500/20 rounded-xl overflow-hidden rotate-1">
                        <ApplicationCard application={activeApplication} onRefresh={fetchApplications} isOverlay={true} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </section>
        </main>
        )}
      </div>

      {isAddOpen && (
        <AddApplicationModal
          onClose={() => setIsAddOpen(false)}
          onSuccess={fetchApplications}
          initialData={initialData}
        />
      )}

      {isImportOpen && (
        <ImportUrlModal
          onClose={() => setIsImportOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}

export default App;
