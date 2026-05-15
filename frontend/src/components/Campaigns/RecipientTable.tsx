import { Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Recipient, RecipientStatus } from './types';

interface RecipientTableProps {
  recipients: Recipient[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onUpdate: (recipient: Recipient, values: Partial<Recipient>) => void;
  onDelete: (recipient: Recipient) => void;
}

export function RecipientTable({ recipients, selectedIds, onToggle, onToggleAll, onUpdate, onDelete }: RecipientTableProps) {
  const [emailSearch, setEmailSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => recipients.filter((recipient) => {
    const matchesEmail = recipient.email.toLowerCase().includes(emailSearch.toLowerCase());
    const matchesCompany = (recipient.company_name || '').toLowerCase().includes(companySearch.toLowerCase());
    return matchesEmail && matchesCompany;
  }), [companySearch, emailSearch, recipients]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);

  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Destinataires</h3>
          <p className="text-sm text-slate-500">Pending = email pas encore envoyé · Failed = erreur pendant l'envoi · Skipped = ignoré.</p>
        </div>
        <div className="flex gap-2">
          <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-white text-sm" placeholder="Email" value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} />
          <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none text-white text-sm" placeholder="Entreprise" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-slate-500 text-xs uppercase">
            <tr>
              <th className="p-3"><input type="checkbox" checked={visible.length > 0 && visible.every((item) => selectedIds.includes(item.id))} onChange={() => onToggleAll(visible.map((item) => item.id))} /></th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Entreprise</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucun destinataire.</td></tr>}
            {visible.map((recipient) => (
              <RecipientRow key={recipient.id} recipient={recipient} checked={selectedIds.includes(recipient.id)} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-800 flex justify-between text-xs text-slate-500">
        <span>{filtered.length} destinataire(s)</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="disabled:opacity-40">Précédent</button>
          <span>{page}/{pageCount}</span>
          <button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(value + 1, pageCount))} className="disabled:opacity-40">Suivant</button>
        </div>
      </div>
    </section>
  );
}

function RecipientRow({ recipient, checked, onToggle, onUpdate, onDelete }: { recipient: Recipient; checked: boolean; onToggle: (id: string) => void; onUpdate: (recipient: Recipient, values: Partial<Recipient>) => void; onDelete: (recipient: Recipient) => void }) {
  const [email, setEmail] = useState(recipient.email);
  const [company, setCompany] = useState(recipient.company_name || '');
  const [contact, setContact] = useState(recipient.contact_name || '');
  const [status, setStatus] = useState<RecipientStatus>(recipient.status);

  return (
    <tr className="border-t border-slate-800">
      <td className="p-3"><input type="checkbox" checked={checked} onChange={() => onToggle(recipient.id)} /></td>
      <td className="p-3"><input className="bg-transparent text-white outline-none w-56" value={email} onChange={(e) => setEmail(e.target.value)} /></td>
      <td className="p-3"><input className="bg-transparent text-slate-300 outline-none w-40" value={company} onChange={(e) => setCompany(e.target.value)} /></td>
      <td className="p-3"><input className="bg-transparent text-slate-300 outline-none w-40" value={contact} onChange={(e) => setContact(e.target.value)} /></td>
      <td className="p-3">
        <select className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200" value={status} onChange={(e) => setStatus(e.target.value as RecipientStatus)}>
          <option value="pending">pending</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
          <option value="skipped">skipped</option>
        </select>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-1">
          <button title="Enregistrer" onClick={() => onUpdate(recipient, { email, company_name: company || null, contact_name: contact || null, status })} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300"><Save className="w-4 h-4" /></button>
          <button title="Supprimer" onClick={() => onDelete(recipient)} className="p-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}
