import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, LogOut, MailCheck, Pause, Play, Rocket, Square, Trash2, Upload, Wifi } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { CampaignDetails } from './CampaignDetails';
import { CampaignLiveLogs } from './CampaignLiveLogs';
import { CampaignProgressCard } from './CampaignProgressCard';
import { CampaignTable } from './CampaignTable';
import { CampaignTabs } from './CampaignTabs';
import type { CampaignTab } from './CampaignTabs';
import { CampaignStepper } from './CampaignStepper';
import { RecipientActions } from './RecipientActions';
import { RecipientBulkAdd } from './RecipientBulkAdd';
import { RecipientTable } from './RecipientTable';
import type { Campaign, CampaignStatus, Recipient } from './types';

const emptyBody = `Madame, Monsieur,

Je me permets de vous adresser ma candidature spontanée pour une alternance en informatique.

Je serais ravi d'échanger avec vous sur les besoins de votre équipe.

Cordialement,`;
const MIN_SCHEDULE_LEAD_MS = 2 * 60 * 1000;
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';

function getLocalScheduledDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CandidatureSpontanee() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(emptyBody);
  const [delaySeconds, setDelaySeconds] = useState(60);
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId) ?? null, [campaigns, selectedId]);
  const hasEmailContent = Boolean((subject || selected?.subject)?.trim() && (body || selected?.body)?.trim());
  const readyToSend = Boolean(selected && selected.total_recipients > 0 && hasEmailContent && gmailConnected);

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
    setConnectedEmail(gmailRes.data.connected_email ?? null);
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
    if (selected.scheduled_at) {
      const scheduled = new Date(selected.scheduled_at);
      setSendMode('scheduled');
      setScheduledDate(toDateInputValue(scheduled));
      setScheduledTime(scheduled.toTimeString().slice(0, 5));
    } else {
      setSendMode('now');
      setScheduledDate('');
      setScheduledTime('08:00');
    }
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
    setActiveTab('overview');
    setMessage('');
  };

  const newCampaign = () => {
    setSelectedId(null);
    setIsCreating(true);
    setActiveTab('email');
    setName('');
    setSubject('');
    setBody(emptyBody);
    setDelaySeconds(60);
    setSendMode('now');
    setScheduledDate('');
    setScheduledTime('08:00');
    setSelectedRecipients([]);
    setMessage('Nouvelle campagne prête. Commencez par rédiger votre email.');
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
    setActiveTab('overview');
    setMessage('Campagne enregistrée. Sélectionnez-la dans la liste pour la reprendre.');
  };

  const saveAndRecipients = async () => {
    const campaign = await saveCampaign();
    setSelectedId(campaign.id);
    setActiveTab('recipients');
    setMessage('Campagne enregistrée. Ajoutez maintenant vos destinataires.');
  };

  const requireSavedCampaign = () => {
    if (!selected) {
      setMessage('Vous devez enregistrer la campagne avant de continuer.');
      setActiveTab('email');
      return null;
    }
    return selected;
  };

  const connectGmail = async () => {
    const res = await axios.get(`${API_BASE}/gmail/connect`);
    window.location.href = res.data.authorization_url;
  };

  const disconnectGmail = async () => {
    if (!window.confirm('Déconnecter Gmail pour votre compte Telxia ?')) return;
    await axios.delete(`${API_BASE}/gmail/disconnect`);
    setMessage('Gmail déconnecté pour votre compte.');
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

  const downloadAttachment = async (attachmentId: string) => {
    if (!selected) return;
    const res = await axios.get(`${API_BASE}/campaigns/${selected.id}/attachments/${attachmentId}/download`);
    window.open(res.data.url, '_blank', 'noopener,noreferrer');
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

  const scheduledAtIso = () => {
    if (sendMode !== 'scheduled' || !scheduledDate || !scheduledTime) return null;
    const planned = getLocalScheduledDate(scheduledDate, scheduledTime);
    if (Number.isNaN(planned.getTime())) return null;
    return planned.toISOString();
  };

  const sendCampaign = async (campaignArg?: Campaign, forceNow = false) => {
    const campaign = campaignArg ?? selected;
    if (!campaign) return;
    const planned = !forceNow ? scheduledAtIso() : null;
    if (!forceNow && sendMode === 'scheduled') {
      if (!planned) {
        setMessage('Choisissez une date et une heure valides pour programmer la campagne.');
        return;
      }
      const plannedDate = new Date(planned);
      if (plannedDate.getTime() < Date.now() + MIN_SCHEDULE_LEAD_MS) {
        setMessage('Choisissez une programmation au moins 2 minutes dans le futur.');
        setActiveTab('settings');
        return;
      }
    }
    if (!window.confirm(planned ? 'Programmer cette campagne ?' : 'Lancer l’envoi de cette campagne maintenant ?')) return;
    try {
      await axios.post(`${API_BASE}/campaigns/${campaign.id}/send`, { delay_seconds: delaySeconds, scheduled_at: planned });
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      setMessage(detail || 'Impossible de lancer ou programmer cette campagne.');
      return;
    }
    setSelectedId(campaign.id);
    setActiveTab('logs');
    setMessage(planned ? 'Campagne programmée. Elle partira automatiquement à l’heure prévue.' : 'Campagne lancée. Les logs se mettent à jour automatiquement.');
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
    setActiveTab('overview');
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

  const nextAction = getNextAction(selected, hasEmailContent, gmailConnected);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-cyan-200">Campagnes Email</span>
              <span className="text-xs text-slate-600">Dashboard / Campagnes / {selected?.name || 'Nouveau workflow'}</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Campagnes Email</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Un flow guidé, compact et lisible pour préparer puis envoyer vos campagnes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={connectGmail} className={`rounded-2xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${gmailConnected ? 'bg-success/10 text-success' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
              {gmailConnected ? <MailCheck className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              {gmailConnected ? `Gmail : ${connectedEmail || 'connecté'}` : 'Connecter Gmail'}
            </button>
            {gmailConnected && (
              <button onClick={disconnectGmail} className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-danger/20 hover:text-danger">
                <LogOut className="inline h-4 w-4" />
              </button>
            )}
            <button onClick={newCampaign} className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-brand-600/15 hover:bg-brand-500">
              Nouvelle campagne
            </button>
          </div>
        </div>
      </section>

      <CampaignStepper campaign={selected} active={activeTab} onStep={setActiveTab} hasDraftContent={hasEmailContent} />

      {message && <p className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-cyan-100">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4 xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
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
            onSend={(campaign) => sendCampaign(campaign, true)}
            onNew={newCampaign}
          />
        </aside>

        <main className="space-y-4">
          <CampaignTabs active={activeTab} onChange={setActiveTab} />
          <InlineGuidance title={nextAction.title} text={nextAction.text} action={nextAction.action} onAction={() => setActiveTab(nextAction.tab)} />
          {renderActiveStep()}
        </main>
      </div>
    </div>
  );

  function renderActiveStep() {
    if (activeTab === 'overview') {
      return (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">{selected ? selected.name : 'Aucune campagne sélectionnée'}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{selected ? selected.subject : 'Créez ou sélectionnez une campagne pour démarrer le workflow.'}</p>
            </div>
            {selected && <CampaignStatusPill status={selected.status} />}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Metric label="Destinataires" value={selected?.total_recipients ?? 0} />
            <Metric label="Envoyés" value={selected?.sent_count ?? 0} />
            <Metric label="Erreurs" value={selected?.failed_count ?? 0} />
            <Metric label="Pièces jointes" value={selected?.attachments.length ?? 0} />
          </div>
          {!selected && (
            <div className="mt-6 rounded-3xl border border-dashed border-brand-500/30 bg-brand-500/10 p-8 text-center">
              <h4 className="font-display text-xl font-bold text-white">Créez votre première campagne</h4>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Le workflow vous guidera ensuite vers les destinataires, l'email, les pièces jointes et l'envoi.</p>
              <button onClick={newCampaign} className="mt-5 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500">Créer campagne</button>
            </div>
          )}
        </section>
      );
    }

    if (activeTab === 'email') {
      return (
        <div className="space-y-4">
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
          <EmailPreview subject={subject} body={body} />
        </div>
      );
    }

    if (activeTab === 'recipients') {
      return (
        <div className="space-y-4">
          {!selected && <WarningCard text="Enregistrez la campagne avant d’ajouter des destinataires." action="Enregistrer maintenant" onClick={saveAndRecipients} />}
          {selected && selected.total_recipients === 0 && <WarningCard text="Ajoutez des destinataires pour continuer vers l’envoi." action="Ajouter un destinataire" onClick={addRecipient} />}
          <RecipientBulkAdd disabled={!selected} onSubmit={bulkAddRecipients} />
          <RecipientActions selectedCount={selectedRecipients.length} onImport={importRecipients} onAttachment={uploadAttachment} onAdd={addRecipient} onBulkDelete={bulkDeleteRecipients} />
          <RecipientTable recipients={selected?.recipients ?? []} selectedIds={selectedRecipients} onToggle={toggleRecipient} onToggleAll={toggleAllRecipients} onUpdate={updateRecipient} onDelete={deleteRecipient} />
        </div>
      );
    }

    if (activeTab === 'attachments') {
      return (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Pièces jointes</h3>
              <p className="text-sm text-slate-500">Ajoutez CV, lettre de motivation ou document utile. Stockage S3 sécurisé.</p>
            </div>
            <label className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition-all ${selected ? 'cursor-pointer bg-brand-600 text-white hover:bg-brand-500' : 'cursor-not-allowed bg-slate-800 text-slate-500'}`}>
              <Upload className="h-4 w-4" /> Ajouter une pièce jointe
              <input disabled={!selected} type="file" className="hidden" onChange={(e) => uploadAttachment(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-slate-950/25 p-6 text-center">
            <p className="font-semibold text-slate-300">Glissez-déposez vos documents ici</p>
            <p className="mt-1 text-xs text-slate-600">ou utilisez le bouton d’ajout. Les fichiers ne sont jamais stockés en base.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(selected?.attachments ?? []).map((attachment) => (
              <div key={attachment.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-300">
                <div className="font-semibold text-white">{attachment.original_filename || attachment.file_name}</div>
                <div className="mt-1 text-xs text-slate-500">{attachment.mime_type || attachment.content_type || 'application/octet-stream'} · {Math.round(((attachment.size ?? attachment.size_bytes ?? 0) / 1024) * 10) / 10} Ko</div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => downloadAttachment(attachment.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-700">
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </button>
                  <button type="button" onClick={() => deleteAttachment(attachment.id, attachment.file_name)} className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/20">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
            {(!selected || selected.attachments.length === 0) && <p className="text-sm text-slate-500">Aucune pièce jointe pour cette campagne.</p>}
          </div>
        </section>
      );
    }

    if (activeTab === 'logs') {
      return (
        <div className="space-y-4">
          <CampaignProgressCard campaign={selected} />
          <div className="flex flex-wrap gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            <button onClick={() => sendCampaign(undefined, sendMode === 'now')} disabled={!readyToSend || (sendMode === 'scheduled' && (!scheduledDate || !scheduledTime))} className="inline-flex items-center gap-2 rounded-2xl bg-success px-4 py-3 font-bold text-white disabled:opacity-50">
              <Rocket className="h-4 w-4" /> {sendMode === 'scheduled' ? 'Programmer' : 'Envoyer maintenant'}
            </button>
            <button onClick={pauseCampaign} disabled={selected?.status !== 'sending'} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 font-bold text-slate-100 disabled:opacity-50">
              <Pause className="h-4 w-4" /> Pause
            </button>
            <button onClick={resumeCampaign} disabled={selected?.status !== 'paused'} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 font-bold text-slate-100 disabled:opacity-50">
              <Play className="h-4 w-4" /> Reprise
            </button>
            <button onClick={cancelCampaign} disabled={!selected || !['sending', 'paused'].includes(selected.status)} className="inline-flex items-center gap-2 rounded-2xl bg-danger px-4 py-3 font-bold text-white disabled:opacity-50">
              <Square className="h-4 w-4" /> Stop
            </button>
          </div>
          <CampaignLiveLogs campaignId={selected?.id ?? null} />
        </div>
      );
    }

    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="font-display text-xl font-bold text-white">Validation et programmation</h3>
        <p className="mt-1 text-sm text-slate-500">Choisissez un envoi immédiat ou programmé.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ChecklistRow done={Boolean(selected)} label="Campagne enregistrée" />
          <ChecklistRow done={Boolean(selected && selected.total_recipients > 0)} label="Destinataires ajoutés" />
          <ChecklistRow done={hasEmailContent} label="Email rédigé" />
          <ChecklistRow done={gmailConnected} label="Gmail connecté" />
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className={`rounded-2xl border p-4 ${sendMode === 'now' ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
              <input type="radio" name="send-mode" checked={sendMode === 'now'} onChange={() => setSendMode('now')} className="mr-2" />
              <span className="font-bold text-white">Envoyer maintenant</span>
              <p className="mt-1 text-xs text-slate-500">La campagne démarre immédiatement.</p>
            </label>
            <label className={`rounded-2xl border p-4 ${sendMode === 'scheduled' ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
              <input type="radio" name="send-mode" checked={sendMode === 'scheduled'} onChange={() => setSendMode('scheduled')} className="mr-2" />
              <span className="font-bold text-white">Programmer l’envoi</span>
              <p className="mt-1 text-xs text-slate-500">Planifiez une date et une heure.</p>
            </label>
          </div>
          {sendMode === 'scheduled' && (
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
              <input type="date" min={toDateInputValue(new Date())} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none" />
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none" />
              <div className="rounded-2xl bg-white/[0.04] px-4 py-3 text-xs text-slate-400">
                Timezone : {userTimezone}
                {scheduledDate && scheduledTime && (
                  <span className="block pt-1 font-semibold text-cyan-200">Envoi prévu le {new Date(`${scheduledDate}T${scheduledTime}:00`).toLocaleString('fr-FR')}</span>
                )}
                <span className="block pt-1 text-slate-500">Minimum : 2 minutes dans le futur.</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={saveCampaign} className="rounded-2xl bg-slate-800 px-4 py-3 font-bold text-slate-100 hover:bg-slate-700">Sauvegarder</button>
          <button onClick={() => sendCampaign()} disabled={!readyToSend || (sendMode === 'scheduled' && (!scheduledDate || !scheduledTime))} className="rounded-2xl bg-brand-600 px-4 py-3 font-bold text-white hover:bg-brand-500 disabled:opacity-50">
            {sendMode === 'scheduled' ? 'Programmer l’envoi' : 'Envoyer maintenant'}
          </button>
        </div>
      </section>
    );
  }
}

function getNextAction(campaign: Campaign | null, hasEmailContent: boolean, gmailConnected: boolean): { title: string; text: string; action: string; tab: CampaignTab } {
  if (campaign?.status === 'scheduled') return { title: 'Campagne programmée', text: `Envoi prévu ${campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString('fr-FR') : 'prochainement'}.`, action: 'Voir logs', tab: 'logs' };
  if (!campaign) return { title: 'Créer la campagne', text: 'Sauvegardez un brouillon pour débloquer les destinataires et pièces jointes.', action: 'Rédiger l’email', tab: 'email' };
  if (campaign.total_recipients === 0) return { title: 'Ajouter des destinataires', text: 'Importez un CSV ou ajoutez vos contacts manuellement.', action: 'Ajouter destinataires', tab: 'recipients' };
  if (!hasEmailContent) return { title: 'Créer votre email', text: 'Préparez le sujet et le message avant de passer à la vérification.', action: 'Créer email', tab: 'email' };
  if (!gmailConnected) return { title: 'Connecter Gmail', text: 'Chaque utilisateur doit connecter son propre Gmail avant l’envoi.', action: 'Vérifier', tab: 'settings' };
  return { title: 'Campagne prête', text: 'Tout est prêt. Lancez l’envoi et suivez les logs en temps réel.', action: 'Envoyer', tab: 'logs' };
}

function InlineGuidance({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-500/15 bg-brand-500/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
      <button onClick={onAction} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-500">{action}</button>
    </div>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-success text-white' : 'bg-slate-800 text-slate-600'}`}>
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className={done ? 'font-semibold text-slate-200' : 'text-slate-500'}>{label}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-950/35 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase text-slate-300">{status}</span>;
}

function WarningCard({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-warning/25 bg-warning/10 p-5 text-warning md:flex-row md:items-center md:justify-between">
      <p className="text-sm font-semibold">{text}</p>
      <button onClick={onClick} className="rounded-2xl bg-warning px-4 py-2 text-sm font-bold text-slate-950">{action}</button>
    </div>
  );
}

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-white">Prévisualisation email</h3>
          <p className="text-sm text-slate-500">Aperçu desktop simplifié avec compteur de caractères.</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">{body.length} caractères</span>
      </div>
      <div className="mt-5 rounded-3xl bg-slate-950/55 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Sujet</p>
        <h4 className="mt-2 font-display text-lg font-bold text-white">{subject || 'Sujet de votre email'}</h4>
        <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-300">
          {body || 'Votre message apparaîtra ici.'}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['{{company_name}}', '{{contact_name}}', '{{email}}'].map((item) => (
            <span key={item} className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-cyan-200">{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
