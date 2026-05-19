import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Save, X } from 'lucide-react';
import type { Application, ApplicationStatus, ApplicationType } from '../../types';
import { API_BASE } from '../../lib/api';
import { DocumentSelector } from '../Documents/DocumentSelector';

interface ApplicationEditModalProps {
    application: Application;
    onClose: () => void;
    onSaved: () => void;
}

interface Company {
    id: string;
    name: string;
    sector: string | null;
}

export function ApplicationEditModal({ application, onClose, onSaved }: ApplicationEditModalProps) {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [saving, setSaving] = useState(false);
    const [companyName, setCompanyName] = useState(application.company?.name || '');
    const [jobTitle, setJobTitle] = useState(application.job_title || '');
    const [status, setStatus] = useState<ApplicationStatus>(application.status);
    const [type, setType] = useState<ApplicationType>(application.type);
    const [salary, setSalary] = useState(application.salary_proposed || '');
    const [location, setLocation] = useState(application.location || '');
    const [remoteMode, setRemoteMode] = useState(application.remote_mode || '');
    const [publicationDate, setPublicationDate] = useState(application.publication_date ? application.publication_date.slice(0, 10) : '');
    const [dateSent, setDateSent] = useState(application.date_sent ? application.date_sent.slice(0, 10) : '');
    const [jobUrl, setJobUrl] = useState(application.job_url || '');
    const [rawDescription, setRawDescription] = useState(application.raw_description || '');
    const [cvDocumentId, setCvDocumentId] = useState(application.cv_document_id || '');
    const [coverLetterDocumentId, setCoverLetterDocumentId] = useState(application.cover_letter_document_id || '');

    useEffect(() => {
        axios.get<Company[]>(`${API_BASE}/companies/`).then(response => setCompanies(response.data)).catch(() => setCompanies([]));
    }, []);

    const resolveCompanyId = async () => {
        const trimmed = companyName.trim();
        const existing = companies.find(company => company.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;
        const response = await axios.post<Company>(`${API_BASE}/companies/`, { name: trimmed, sector: application.company?.sector || null });
        return response.data.id;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!jobTitle.trim() || !companyName.trim()) return;
        setSaving(true);
        try {
            const companyId = await resolveCompanyId();
            await axios.put(`${API_BASE}/applications/${application.id}`, {
                company_id: companyId,
                job_title: jobTitle.trim(),
                status,
                type,
                contract_type: type,
                salary_proposed: salary || null,
                location: location || null,
                remote_mode: remoteMode || null,
                publication_date: publicationDate ? new Date(publicationDate).toISOString() : null,
                date_sent: dateSent ? new Date(dateSent).toISOString() : null,
                job_url: jobUrl || null,
                raw_description: rawDescription || null,
                cv_document_id: cvDocumentId || null,
                cover_letter_document_id: coverLetterDocumentId || null,
            });
            onSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(event) => event.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
                    <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                            <Save className="w-5 h-5 text-brand-500" />
                        </div>
                        Modifier la candidature
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Intitulé du poste *</label>
                            <input className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 focus:border-brand-500 focus:outline-none" placeholder="Ex: Data Engineer Alternance" value={jobTitle} onChange={event => setJobTitle(event.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entreprise *</label>
                            <input className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 focus:border-brand-500 focus:outline-none" placeholder="Ex: Capgemini" value={companyName} onChange={event => setCompanyName(event.target.value)} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <select className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={status} onChange={event => setStatus(event.target.value as ApplicationStatus)}>
                            <option value="Wishlist">Liste de souhaits</option>
                            <option value="Applied">Postulé</option>
                            <option value="Follow-up">Relance</option>
                            <option value="Interview">Entretien</option>
                            <option value="Technical Test">Test Technique</option>
                            <option value="Offer">Offre</option>
                            <option value="Rejected">Refusé</option>
                        </select>
                        <select className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={type} onChange={event => setType(event.target.value as ApplicationType)}>
                            <option value="Stage">Stage</option>
                            <option value="Alternance">Alternance</option>
                            <option value="CDI">CDI</option>
                            <option value="CDD">CDD</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Temps partiel">Temps partiel</option>
                            <option value="Temps plein">Temps plein</option>
                            <option value="Interim">Interim</option>
                        </select>
                        <input className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Salaire" value={salary} onChange={event => setSalary(event.target.value)} />
                        <input className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Lieu" value={location} onChange={event => setLocation(event.target.value)} />
                        <select className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={remoteMode} onChange={event => setRemoteMode(event.target.value)}>
                            <option value="">Remote non précisé</option>
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybride</option>
                            <option value="On-site">Sur site</option>
                        </select>
                        <input type="date" className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={publicationDate} onChange={event => setPublicationDate(event.target.value)} />
                        <input type="date" className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={dateSent} onChange={event => setDateSent(event.target.value)} />
                        <input type="url" className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Lien de l'offre" value={jobUrl} onChange={event => setJobUrl(event.target.value)} />
                    </div>

                    <textarea rows={5} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 focus:border-brand-500 focus:outline-none custom-scrollbar" placeholder="Description, notes, informations utiles..." value={rawDescription} onChange={event => setRawDescription(event.target.value)} />

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Documents associés</h3>
                        <DocumentSelector label="CV sélectionné" acceptedTypes={['CV']} selectedDocumentId={cvDocumentId} onChange={setCvDocumentId} />
                        <DocumentSelector label="Lettre de motivation" acceptedTypes={['Lettre motivation']} selectedDocumentId={coverLetterDocumentId} onChange={setCoverLetterDocumentId} />
                    </div>

                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-white transition-colors">Annuler</button>
                        <button disabled={saving} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 flex items-center gap-3">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Sauvegarder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
