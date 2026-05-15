import type { Campaign } from './types';

interface CampaignDetailsProps {
  campaign: Campaign | null;
  isCreating: boolean;
  name: string;
  subject: string;
  body: string;
  delaySeconds: number;
  onName: (value: string) => void;
  onSubject: (value: string) => void;
  onBody: (value: string) => void;
  onDelay: (value: number) => void;
  onSave: () => void;
  onSaveAndClose: () => void;
  onSaveAndRecipients: () => void;
}

export function CampaignDetails(props: CampaignDetailsProps) {
  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white">
          {props.isCreating ? 'Nouvelle campagne' : `Modifier : ${props.campaign?.name || props.name}`}
        </h2>
        <p className="text-sm text-slate-500">Sauvegardez en brouillon sans lancer l'envoi. Les destinataires restent dans leur onglet dédié.</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-white" value={props.name} onChange={(e) => props.onName(e.target.value)} placeholder="Nom de campagne" />
          <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-white" value={props.subject} onChange={(e) => props.onSubject(e.target.value)} placeholder="Sujet de l'email" />
        </div>
        <textarea className="w-full min-h-56 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-white resize-y" value={props.body} onChange={(e) => props.onBody(e.target.value)} placeholder="Corps du message" />
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-xs text-slate-500">
            Délai entre emails
            <input className="block w-32 mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-white" type="number" min={0} value={props.delaySeconds} onChange={(e) => props.onDelay(Number(e.target.value))} title="Valeur par défaut: 60 secondes" />
          </label>
          <button onClick={props.onSave} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-3">Enregistrer comme brouillon</button>
          <button onClick={props.onSaveAndClose} className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl px-4 py-3">Enregistrer et fermer</button>
          <button onClick={props.onSaveAndRecipients} className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl px-4 py-3">Enregistrer et ajouter des destinataires</button>
        </div>
      </div>
    </section>
  );
}
