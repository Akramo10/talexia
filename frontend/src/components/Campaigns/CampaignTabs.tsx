export type CampaignTab = 'info' | 'recipients' | 'attachments' | 'sending';

const tabs: Array<{ id: CampaignTab; label: string }> = [
  { id: 'info', label: 'Informations' },
  { id: 'recipients', label: 'Destinataires' },
  { id: 'attachments', label: 'Pièces jointes' },
  { id: 'sending', label: 'Envoi & logs' },
];

export function CampaignTabs({ active, onChange }: { active: CampaignTab; onChange: (tab: CampaignTab) => void }) {
  return (
    <div className="flex flex-wrap gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${active === tab.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
