import { Copy, Edit, Play, Plus, Search, Trash2 } from 'lucide-react';
import type { Campaign, CampaignStatus } from './types';

interface CampaignTableProps {
  campaigns: Campaign[];
  selectedId: string | null;
  search: string;
  status: CampaignStatus | 'all';
  onSearch: (value: string) => void;
  onStatus: (value: CampaignStatus | 'all') => void;
  onSelect: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
  onSend: (campaign: Campaign) => void;
  onNew: () => void;
}

const statuses: Array<CampaignStatus | 'all'> = ['all', 'draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled'];

export function CampaignTable(props: CampaignTableProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Campagnes</h2>
            <p className="text-xs text-slate-500">Sélectionnez un brouillon ou créez un nouveau flow.</p>
          </div>
          <button onClick={props.onNew} title="Nouvelle campagne" className="rounded-2xl bg-brand-600 p-3 text-white hover:bg-brand-500">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none" placeholder="Rechercher" value={props.search} onChange={(e) => props.onSearch(e.target.value)} />
          </div>
          <select className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 outline-none" value={props.status} onChange={(e) => props.onStatus(e.target.value as CampaignStatus | 'all')}>
            {statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'Tous les statuts' : item}</option>)}
          </select>
        </div>
      </div>
      <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
        {props.campaigns.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 p-6 text-center">
            <p className="font-display text-lg font-bold text-white">Aucune campagne</p>
            <p className="mt-2 text-sm text-slate-500">Créez un brouillon pour commencer.</p>
            <button onClick={props.onNew} className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">Créer campagne</button>
          </div>
        )}
        {props.campaigns.map((campaign) => {
          const active = campaign.id === props.selectedId;
          return (
            <article key={campaign.id} className={`rounded-3xl border p-4 transition-all ${active ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-slate-950/25 hover:bg-white/[0.04]'}`}>
              <button onClick={() => props.onSelect(campaign)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-bold text-white">{campaign.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{campaign.subject}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Contacts" value={campaign.total_recipients} />
                  <MiniStat label="Envoyés" value={campaign.sent_count} />
                  <MiniStat label="Erreurs" value={campaign.failed_count} />
                </div>
              </button>
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-slate-600">{new Date(campaign.updated_at).toLocaleDateString('fr-FR')}</span>
                <div className="flex gap-1">
                  <IconButton title="Ouvrir" onClick={() => props.onSelect(campaign)}><Edit className="h-3.5 w-3.5" /></IconButton>
                  <IconButton title="Dupliquer" onClick={() => props.onDuplicate(campaign)}><Copy className="h-3.5 w-3.5" /></IconButton>
                  <IconButton title="Envoyer" onClick={() => props.onSend(campaign)}><Play className="h-3.5 w-3.5" /></IconButton>
                  <IconButton title="Supprimer" onClick={() => props.onDelete(campaign)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.045] px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-600">{label}</p>
      <p className="font-display text-lg font-bold text-slate-200">{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const color = status === 'completed' ? 'text-success bg-success/10' : status === 'failed' || status === 'cancelled' ? 'text-danger bg-danger/10' : status === 'sending' ? 'text-info bg-info/10' : status === 'paused' ? 'text-warning bg-warning/10' : 'text-slate-300 bg-slate-800';
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${color}`} title={status}>{status}</span>;
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="rounded-xl bg-slate-900 p-2 text-slate-400 hover:bg-slate-700 hover:text-white">{children}</button>;
}
