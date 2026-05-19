import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDownUp, Edit3, ExternalLink, FileText, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { API_BASE } from '../../lib/api';
import { COLUMNS } from '../../types';
import type { Application, ApplicationStatus } from '../../types';

interface ApplicationTableViewProps {
  applications: Application[];
  onRefresh: () => void;
}

type SortKey = 'company' | 'job' | 'type' | 'status' | 'date' | 'activity';

const statusTone: Record<ApplicationStatus, string> = {
  Wishlist: 'bg-slate-700/70 text-slate-200',
  Applied: 'bg-brand-500/15 text-cyan-200',
  'Follow-up': 'bg-warning/15 text-warning',
  Interview: 'bg-success/15 text-success',
  'Technical Test': 'bg-info/15 text-info',
  Rejected: 'bg-danger/15 text-danger',
  Offer: 'bg-emerald-400/15 text-emerald-300',
};

export function ApplicationTableView({ applications, onRefresh }: ApplicationTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('activity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const sorted = useMemo(() => {
    const valueFor = (app: Application) => {
      if (sortKey === 'company') return app.company?.name || '';
      if (sortKey === 'job') return app.job_title || '';
      if (sortKey === 'type') return app.type || '';
      if (sortKey === 'status') return app.status || '';
      if (sortKey === 'date') return app.date_sent || '';
      return app.last_contact_date || '';
    };
    return [...applications].sort((a, b) => {
      const left = valueFor(a);
      const right = valueFor(b);
      const result = String(left).localeCompare(String(right));
      return sortDirection === 'asc' ? result : -result;
    });
  }, [applications, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) {
      setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const updateStatus = async (app: Application, status: ApplicationStatus) => {
    await axios.put(`${API_BASE}/applications/${app.id}`, {
      company_id: app.company_id,
      status,
    });
    onRefresh();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">Tableau candidatures</h3>
          <p className="text-xs text-slate-500">Vue CRM lisible avec tri, pagination et édition rapide du statut.</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">{applications.length} lignes</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left">
          <thead className="bg-slate-950/35 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {[
                ['Entreprise', 'company'],
                ['Poste', 'job'],
                ['Type contrat', 'type'],
                ['Statut', 'status'],
                ['Date candidature', 'date'],
                ['Relance', 'activity'],
              ].map(([label, key]) => (
                <th key={key} className="px-4 py-3">
                  <button onClick={() => toggleSort(key as SortKey)} className="inline-flex items-center gap-1.5 hover:text-slate-300">
                    {label}
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Dernière activité</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((app) => (
              <tr key={app.id} className="group transition-colors hover:bg-white/[0.045]">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-100">{app.company?.name || 'Entreprise inconnue'}</div>
                  <div className="text-xs text-slate-500">{app.location || app.company?.sector || 'Non renseigné'}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-[220px] truncate font-semibold text-slate-200">{app.job_title || 'Poste sans titre'}</div>
                  <div className="text-xs text-slate-500">{app.remote_mode || 'Mode non renseigné'}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-cyan-200">{app.type}</span>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={app.status}
                    onChange={(event) => updateStatus(app, event.target.value as ApplicationStatus)}
                    className={`rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold outline-none ${statusTone[app.status]}`}
                  >
                    {COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>{column.id}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-4 text-sm text-slate-400">{app.date_sent ? new Date(app.date_sent).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="px-4 py-4 text-sm text-slate-400">{app.last_contact_date ? new Date(app.last_contact_date).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="px-4 py-4">
                  {app.job_url ? (
                    <a href={app.job_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-200 hover:text-white">
                      Source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : <span className="text-xs text-slate-600">-</span>}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="h-4 w-4 text-slate-500" />
                    {(app.cv_document ? 1 : 0) + (app.cover_letter_document ? 1 : 0)} fichier(s)
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-400">
                  {formatDistanceToNow(new Date(app.last_contact_date), { addSuffix: true, locale: fr })}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-1">
                    <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-800 hover:text-white" title="Edition rapide">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-800 hover:text-white" title="Actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {applications.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 rounded-3xl bg-brand-500/10 p-4 text-cyan-200">
            <BriefcaseMini />
          </div>
          <h3 className="font-display text-xl font-bold text-white">Aucune candidature pour le moment</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">Ajoutez votre première opportunité pour commencer à structurer votre recherche.</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs text-slate-500">
        <span>Page {page} sur {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl bg-slate-800 px-3 py-2 font-bold text-slate-300 disabled:opacity-40">Précédent</button>
          <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl bg-slate-800 px-3 py-2 font-bold text-slate-300 disabled:opacity-40">Suivant</button>
        </div>
      </div>
    </div>
  );
}

function BriefcaseMini() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
