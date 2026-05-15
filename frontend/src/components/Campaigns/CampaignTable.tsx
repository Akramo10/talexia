import { Copy, Edit, Play, Trash2 } from 'lucide-react';
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
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Liste des campagnes</h2>
          <p className="text-sm text-slate-500">Draft = sauvegardée sans envoi · Paused = temporairement suspendue.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={props.onNew} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-3 py-2 text-sm">Nouvelle campagne</button>
          <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-white text-sm" placeholder="Rechercher" value={props.search} onChange={(e) => props.onSearch(e.target.value)} />
          <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-white text-sm" value={props.status} onChange={(e) => props.onStatus(e.target.value as CampaignStatus | 'all')}>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Destinataires</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.campaigns.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune campagne. Créez un brouillon pour commencer.</td></tr>
            )}
            {props.campaigns.map((campaign) => (
              <tr key={campaign.id} className={`border-t border-slate-800 hover:bg-slate-800/30 ${campaign.id === props.selectedId ? 'bg-brand-500/10' : ''}`}>
                <td className="p-3">
                  <button onClick={() => props.onSelect(campaign)} className="text-left">
                    <span className="font-semibold text-white">{campaign.name}</span>
                    <span className="block text-xs text-slate-500 truncate max-w-xs">{campaign.subject}</span>
                  </button>
                </td>
                <td className="p-3"><StatusBadge status={campaign.status} /></td>
                <td className="p-3 text-slate-300">{campaign.total_recipients}</td>
                <td className="p-3 text-slate-500">{new Date(campaign.updated_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Ouvrir / éditer" onClick={() => props.onSelect(campaign)}><Edit className="w-4 h-4" /></IconButton>
                    <IconButton title="Dupliquer" onClick={() => props.onDuplicate(campaign)}><Copy className="w-4 h-4" /></IconButton>
                    <IconButton title="Envoyer" onClick={() => props.onSend(campaign)}><Play className="w-4 h-4" /></IconButton>
                    <IconButton title="Supprimer" onClick={() => props.onDelete(campaign)}><Trash2 className="w-4 h-4" /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const color = status === 'completed' ? 'text-success bg-success/10' : status === 'failed' || status === 'cancelled' ? 'text-danger bg-danger/10' : status === 'sending' ? 'text-info bg-info/10' : status === 'paused' ? 'text-warning bg-warning/10' : 'text-slate-300 bg-slate-800';
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${color}`} title={status}>{status}</span>;
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300">{children}</button>;
}
