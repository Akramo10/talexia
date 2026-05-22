import { Activity, FileText, Mail, Paperclip, Settings, Users } from 'lucide-react';

export type CampaignTab = 'overview' | 'recipients' | 'email' | 'attachments' | 'logs' | 'settings';

export const campaignTabs: Array<{ id: CampaignTab; label: string; description: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Vue générale', description: 'Etat et progression', icon: Activity },
  { id: 'recipients', label: 'Destinataires', description: 'Contacts à cibler', icon: Users },
  { id: 'email', label: 'Email', description: 'Sujet et template', icon: Mail },
  { id: 'attachments', label: 'Pièces jointes', description: 'CV, LM, fichiers', icon: Paperclip },
  { id: 'logs', label: 'Logs', description: 'Envoi temps réel', icon: FileText },
  { id: 'settings', label: 'Validation', description: 'Programmer ou envoyer', icon: Settings },
];

export function CampaignTabs({ active, onChange }: { active: CampaignTab; onChange: (tab: CampaignTab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-1">
      {campaignTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`group flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-left transition-all ${isActive ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'}`}
          >
            <span className="flex items-center gap-2 text-xs font-bold">
              <Icon className="h-4 w-4" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
