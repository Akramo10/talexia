import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Trash2, Upload, Wifi } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { CampaignDetails } from './CampaignDetails';
import { CampaignLiveLogs } from './CampaignLiveLogs';
import { CampaignProgressCard } from './CampaignProgressCard';
import { CampaignTable } from './CampaignTable';
import { CampaignTabs } from './CampaignTabs';
import type { CampaignTab } from './CampaignTabs';
import { RecipientActions } from './RecipientActions';
import { RecipientBulkAdd } from './RecipientBulkAdd';
import { RecipientTable } from './RecipientTable';
import type { Campaign, CampaignStatus, Recipient } from './types';

const emptyBody = `Madame, Monsieur,

Je me permets de vous adresser ma candidature spontanée pour une alternance en informatique.

Je serais ravi d'échanger avec vous sur les besoins de votre équipe.

Cordialement,`;

export function CandidatureSpontanee() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<CampaignTab>('info');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(emptyBody);
  const [delaySeconds, setDelaySeconds] = useState(60);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId) ?? null, [campaigns, selectedId]);

  const refresh = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const [campaignRes, gmailRes] = await Promise.all([
      axios.get(`${API_BASE}/campaigns/?${params.toString()}`),
      axios.get(`${API_BASE}/gmail/status`),
    ]);
    setCampaigns(campaignRes.data);
    setGmailConnected(gmailRes.data.connected);
  };

  useEffect(() => {
    refresh().catch(() => setMessage('Impossible de charger les campagnes.'));
  }, [search, statusFilter]);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setSubject(selected.subject);
    setBody(selected.body);
    setDelaySeconds(selected.send_delay_seconds || 60);
    setSelectedRecipients([]);
  }, [selected]);

  useEffect(() => {
    if (!selected || !['sending', 'paused'].includes(selected.status)) return;
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
  }, [selected?.id, selected?.status, search, statusFilter]);

  const selectCampaign = (campaign: Campaign) => {
    setSelectedId(campaign.id);
    setIsCreating(false);
    setActiveTab('info');
    setMessage('');
  };

  const newCampaign = () => {
    setSelectedId(null);
    setIsCreating(true);
    setActiveTab('info');
    setName('');
    setSubject('');
    setBody(emptyBody);
    setDelaySeconds(60);
    setSelectedRecipients([]);
    setMessage('Nouvelle campagne prête à être saisie.');
  };

  const createCampaign = async () => {
    const res = await axios.post(`${API_BASE}/campaigns/`, {
      name: name || 'Nouvelle campagne',
      subject: subject || 'Candidature spontanée',
      body,
      send_delay_seconds: delaySeconds,
    });
    setSelectedId(res.data.id);
    setIsCreating(false);
    setMessage('Campagne enregistrée en brouillon.');
    await refresh();
    return res.data as Campaign;
  };

  const saveCampaign = async () => {
    if (!selected) return createCampaign();
    const res = await axios.put(`${API_BASE}/campaigns/${selected.id}`, {
      name,
      subject,
      body,
      send_delay_seconds: delaySeconds,
      status: 'draft',
    });
    setMessage('Campagne mise à jour.');
    await refresh();
    return res.data as Campaign;
  };

  const saveAndClose = async () => {
    await saveCampaign();
    setSelectedId(null);
    setIsCreating(false);
    setActiveTab('info');
    setMessage('Campagne enregistrée. Sélectionnez-la dans la liste pour la reprendre.');
  };

  const saveAndRecipients = async () => {
    const campaign = await saveCampaign();
    setSelectedId(campaign.id);
    setActiveTab('recipients');
    setMessage('Campagne enregistrée. Vous pouvez maintenant ajouter des destinataires.');
  };

  const requireSavedCampaign = () => {
    if (!selected) {
      setMessage('Vous devez enregistrer la campagne avant d’ajouter des destinataires.');
      setActiveTab('info');
      return null;
    }
    return selected;
  };

  const importEmailSenderToken = async () => {
    await axios.post(`${API_BASE}/gmail/import-local-token`);
    setMessage('Token Gmail de email sender importé.');
    await refresh();
  };

  const importRecipients = async (file: File | null) => {
    if (!file) return;
    const campaign = requireSavedCampaign();
    if (!campaign) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/campaigns/${campaign.id}/recipients/import`, formData);
    setMessage(`${res.data.imported} destinataire(s) importé(s).`);
    await refresh();
  };

  const uploadAttachment = async (file: File | null) => {
    if (!file) return;
    const campaign = requireSavedCampaign();
    if (!campaign) return;
    const formData = new FormData();
    formData.append('file', file);
    await axios.post(`${API_BASE}/campaigns/${campaign.id}/attachments`, formData);
    setMessage('Pièce jointe ajoutée.');
    await refresh();
  };

  const deleteAttachment = async (attachmentId: string, fileName: string) => {
    if (!selected || !window.confirm(`Supprimer la pièce jointe "${fileName}" ?`)) return;
    await axios.delete(`${API_BASE}/campaigns/${selected.id}/attachments/${attachmentId}`);
    setMessage('Pièce jointe supprimée.');
    await refresh();
  };

  const addRecipient = async () => {
    const campaign = requireSavedCampaign();
    if (!campaign) return;
    const email = window.prompt('Email du destinataire');
    if (!email) return;
    await axios.post(`${API_BASE}/campaigns/${campaign.id}/recipients`, { email });
    setMessage('Destinataire ajouté.');
    await refresh();
  };

  const bulkAddRecipients = async (rawText: string) => {
    const campaign = requireSavedCampaign();
    if (!campaign) return null;
    const res = await axios.post(`${API_BASE}/campaigns/${campaign.id}/recipients/bulk`, { raw_text: rawText });
    setMessage(`${res.data.created_count} emails ajoutés, ${res.data.duplicate_count} doublons ignorés, ${res.data.invalid_count} invalides.`);
    await refresh();
    return res.data;
  };

  const updateRecipient = async (recipient: Recipient, values: Partial<Recipient>) => {
    if (!selected) return;
    await axios.put(`${API_BASE}/campaigns/${selected.id}/recipients/${recipient.id}`, values);
    setMessage('Destinataire mis à jour.');
    await refresh();
  };

  const deleteRecipient = async (recipient: Recipient) => {
    if (!selected || !window.confirm(`Supprimer ${recipient.email} ?`)) return;
    await axios.delete(`${API_BASE}/campaigns/${selected.id}/recipients/${recipient.id}`);
    setMessage('Destinataire supprimé.');
    await refresh();
  };

  const bulkDeleteRecipients = async () => {
    if (!selected || selectedRecipients.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedRecipients.length} destinataire(s) ?`)) return;
    await axios.post(`${API_BASE}/campaigns/${selected.id}/recipients/bulk-delete`, { recipient_ids: selectedRecipients });
    setSelectedRecipients([]);
    setMessage('Destinataires supprimés.');
    await refresh();
  };

  const sendCampaign = async (campaignArg?: Campaign) => {
    const campaign = campaignArg ?? selected;
    if (!campaign || !window.confirm('Lancer l’envoi de cette campagne ?')) return;
    await axios.post(`${API_BASE}/campaigns/${campaign.id}/send`, { delay_seconds: delaySeconds });
    setSelectedId(campaign.id);
    setActiveTab('sending');
    setMessage('Campagne lancée. Les logs se mettent à jour automatiquement.');
    await refresh();
  };

  const pauseCampaign = async () => {
    if (!selected) return;
    await axios.post(`${API_BASE}/campaigns/${selected.id}/pause`);
    await refresh();
  };

  const resumeCampaign = async () => {
    if (!selected) return;
    await axios.post(`${API_BASE}/campaigns/${selected.id}/resume`);
    await refresh();
  };

  const cancelCampaign = async () => {
    if (!selected || !window.confirm('Stopper définitivement cet envoi ?')) return;
    await axios.post(`${API_BASE}/campaigns/${selected.id}/cancel`);
    await refresh();
  };

  const duplicateCampaign = async (campaign: Campaign) => {
    const res = await axios.post(`${API_BASE}/campaigns/${campaign.id}/duplicate`);
    setSelectedId(res.data.id);
    setIsCreating(false);
    setActiveTab('info');
    await refresh();
  };

  const deleteCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Supprimer la campagne "${campaign.name}" ?`)) return;
    await axios.delete(`${API_BASE}/campaigns/${campaign.id}`);
    if (selectedId === campaign.id) setSelectedId(null);
    setMessage('Campagne supprimée.');
    await refresh();
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const toggleAllRecipients = (ids: string[]) => {
    setSelectedRecipients((items) => ids.every((id) => items.includes(id)) ? items.filter((id) => !ids.includes(id)) : Array.from(new Set([...items, ...ids])));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Candidature spontanée</h2>
          <p className="text-sm text-slate-500">Mini CRM emailing avec brouillons, destinataires, logs et contrôle d’envoi.</p>
        </div>
        <button onClick={importEmailSenderToken} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${gmailConnected ? 'bg-success/10 text-success' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
          <Wifi className="w-4 h-4" />
          {gmailConnected ? 'Gmail connecté' : 'Utiliser email sender'}
        </button>
      </div>

      {message && <p className="text-sm text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3">{message}</p>}

      <CampaignTable
        campaigns={campaigns}
        selectedId={selected?.id ?? null}
        search={search}
        status={statusFilter}
        onSearch={setSearch}
        onStatus={setStatusFilter}
        onSelect={selectCampaign}
        onDuplicate={duplicateCampaign}
        onDelete={deleteCampaign}
        onSend={sendCampaign}
        onNew={newCampaign}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <CampaignTabs active={activeTab} onChange={setActiveTab} />

          {activeTab === 'info' && (
            <CampaignDetails
              campaign={selected}
              isCreating={isCreating || !selected}
              name={name}
              subject={subject}
              body={body}
              delaySeconds={delaySeconds}
              onName={setName}
              onSubject={setSubject}
              onBody={setBody}
              onDelay={setDelaySeconds}
              onSave={saveCampaign}
              onSaveAndClose={saveAndClose}
              onSaveAndRecipients={saveAndRecipients}
            />
          )}

          {activeTab === 'recipients' && (
            <div className="space-y-4">
              {!selected && (
                <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 text-warning text-sm">
                  Vous devez enregistrer la campagne avant d’ajouter des destinataires.
                  <button onClick={saveAndRecipients} className="ml-3 bg-warning text-slate-950 font-semibold rounded-lg px-3 py-1">Enregistrer puis ajouter</button>
                </div>
              )}
              <RecipientBulkAdd disabled={!selected} onSubmit={bulkAddRecipients} />
              <RecipientActions selectedCount={selectedRecipients.length} onImport={importRecipients} onAttachment={uploadAttachment} onAdd={addRecipient} onBulkDelete={bulkDeleteRecipients} />
              <RecipientTable recipients={selected?.recipients ?? []} selectedIds={selectedRecipients} onToggle={toggleRecipient} onToggleAll={toggleAllRecipients} onUpdate={updateRecipient} onDelete={deleteRecipient} />
            </div>
          )}

          {activeTab === 'attachments' && (
            <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-white">Pièces jointes</h3>
              <p className="text-sm text-slate-500 mb-4">Ajoutez un CV, une lettre de motivation ou tout document utile.</p>
              {!selected && (
                <div className="mb-4 bg-warning/10 border border-warning/30 rounded-2xl p-4 text-warning text-sm">
                  Vous devez enregistrer la campagne avant d’ajouter des pièces jointes.
                  <button onClick={saveCampaign} className="ml-3 bg-warning text-slate-950 font-semibold rounded-lg px-3 py-1">Enregistrer maintenant</button>
                </div>
              )}
              <label className={`inline-flex items-center gap-2 font-semibold rounded-xl px-3 py-2 ${selected ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                <Upload className="w-4 h-4" /> Ajouter une pièce jointe
                <input disabled={!selected} type="file" className="hidden" onChange={(e) => uploadAttachment(e.target.files?.[0] ?? null)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selected?.attachments ?? []).map((attachment) => (
                  <span key={attachment.id} className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-300 inline-flex items-center gap-2">
                    {attachment.file_name}
                    <button
                      type="button"
                      title="Supprimer la pièce jointe"
                      onClick={() => deleteAttachment(attachment.id, attachment.file_name)}
                      className="text-slate-500 hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                {(!selected || selected.attachments.length === 0) && <p className="text-sm text-slate-500">Aucune pièce jointe.</p>}
              </div>
            </section>
          )}

          {activeTab === 'sending' && (
            <div className="space-y-8">
              <CampaignProgressCard campaign={selected} />
              <div className="flex flex-wrap gap-3">
                <button onClick={() => sendCampaign()} disabled={!selected || !gmailConnected} className="bg-success hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3">Envoyer</button>
                <button onClick={pauseCampaign} disabled={selected?.status !== 'sending'} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-semibold rounded-xl px-4 py-3">Pause</button>
                <button onClick={resumeCampaign} disabled={selected?.status !== 'paused'} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-semibold rounded-xl px-4 py-3">Resume</button>
                <button onClick={cancelCampaign} disabled={!selected || !['sending', 'paused'].includes(selected.status)} className="bg-danger hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3">Cancel</button>
              </div>
              <CampaignLiveLogs campaignId={selected?.id ?? null} />
            </div>
          )}
        </div>

        <aside className="xl:col-span-4 space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase text-slate-500">Contexte</h3>
            <p className="mt-3 text-sm text-slate-400">
              {selected ? `Campagne sélectionnée : ${selected.name}` : isCreating ? 'Mode création : aucune campagne sauvegardée.' : 'Aucune campagne sélectionnée.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Sélectionner une campagne ouvre Informations. Les destinataires ne s’affichent que si vous ouvrez leur onglet.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
