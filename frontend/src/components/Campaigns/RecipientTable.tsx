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

const statusClass: Record<RecipientStatus, string> = {
  pending: 'bg-slate-800 text-slate-300',
  sent: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  skipped: 'bg-warning/10 text-warning',
};

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
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Destinataires</h3>
          <p className="text-sm text-slate-500">Ajoutez, recherchez, éditez et suivez l'état de chaque contact.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Rechercher email" value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} />
          <input className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Entreprise" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-950/45 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="p-3"><input type="checkbox" checked={visible.length > 0 && visible.every((item) => selectedIds.includes(item.id))} onChange={() => onToggleAll(visible.map((item) => item.id))} /></th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Entreprise</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-500">Aucun destinataire. Importez un CSV ou ajoutez un contact pour continuer.</td></tr>}
            {visible.map((recipient) => (
              <RecipientRow key={recipient.id} recipient={recipient} checked={selectedIds.includes(recipient.id)} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t border-white/10 p-4 text-xs text-slate-500">
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
    <tr className="border-t border-white/10 transition-colors hover:bg-white/[0.03]">
      <td className="p-3"><input type="checkbox" checked={checked} onChange={() => onToggle(recipient.id)} /></td>
      <td className="p-3"><input className="w-56 bg-transparent text-white outline-none" value={email} onChange={(e) => setEmail(e.target.value)} /></td>
      <td className="p-3"><input className="w-40 bg-transparent text-slate-300 outline-none" value={company} onChange={(e) => setCompany(e.target.value)} /></td>
      <td className="p-3"><input className="w-40 bg-transparent text-slate-300 outline-none" value={contact} onChange={(e) => setContact(e.target.value)} /></td>
      <td className="p-3">
        <select className={`rounded-full border border-white/10 px-2 py-1 text-xs font-bold outline-none ${statusClass[status]}`} value={status} onChange={(e) => setStatus(e.target.value as RecipientStatus)}>
          <option value="pending">pending</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
          <option value="skipped">skipped</option>
        </select>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-1">
          <button title="Enregistrer" onClick={() => onUpdate(recipient, { email, company_name: company || null, contact_name: contact || null, status })} className="rounded-xl bg-slate-900 p-2 text-slate-300 hover:bg-slate-700"><Save className="h-4 w-4" /></button>
          <button title="Supprimer" onClick={() => onDelete(recipient)} className="rounded-xl bg-danger/10 p-2 text-danger hover:bg-danger/20"><Trash2 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
}
