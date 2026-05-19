import { useState, useEffect } from 'react';
import axios from 'axios';
import type { AxiosError } from 'axios';
import { Loader2, X, Plus } from 'lucide-react';
import type { ApplicationStatus, ApplicationType } from '../../types';
import { API_BASE } from '../../lib/api';
import { DocumentSelector } from '../Documents/DocumentSelector';

interface AddApplicationModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: { job_url?: string; raw_description?: string; company_name?: string; contract_type?: string; sector?: string; location?: string; salary?: string; description?: string; benefits?: string; job_title?: string; publication_date?: string; scraped_at?: string; remote_mode?: string };
}

interface Company {
    id: string;
    name: string;
    sector: string | null;
}

export function AddApplicationModal({ onClose, onSuccess, initialData }: AddApplicationModalProps) {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);

    const [isNewCompany, setIsNewCompany] = useState(!!initialData?.company_name);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [newCompanyName, setNewCompanyName] = useState(initialData?.company_name || '');
    const [newCompanySector, setNewCompanySector] = useState(initialData?.sector || '');

    const [status, setStatus] = useState<ApplicationStatus>('Wishlist');
    const [jobTitle, setJobTitle] = useState(initialData?.job_title || '');
    const [type, setType] = useState<ApplicationType>((initialData?.contract_type as ApplicationType) || 'Alternance');
    const [salary, setSalary] = useState(initialData?.salary || '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [remoteMode, setRemoteMode] = useState(initialData?.remote_mode || '');
    const [publicationDate, setPublicationDate] = useState(initialData?.publication_date ? initialData.publication_date.slice(0, 10) : '');
    const [jobUrl, setJobUrl] = useState(initialData?.job_url || '');
    const [rawDesc, setRawDesc] = useState(initialData?.raw_description || '');
    const [cvDocumentId, setCvDocumentId] = useState('');
    const [coverLetterDocumentId, setCoverLetterDocumentId] = useState('');
    const [urlExists, setUrlExists] = useState(false);

    useEffect(() => {
        const checkUrl = async () => {
            if (jobUrl && jobUrl !== initialData?.job_url) {
                try {
                    const res = await axios.get(`${API_BASE}/applications/check`, { params: { url: jobUrl } });
                    setUrlExists(res.data.exists);
                } catch (e) {
                    console.error("Error checking URL:", e);
                }
            } else {
                setUrlExists(false);
            }
        };
        const timer = setTimeout(checkUrl, 500);
        return () => clearTimeout(timer);
    }, [jobUrl, initialData?.job_url]);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await axios.get(`${API_BASE}/companies/`);
                setCompanies(res.data);
                if (res.data.length > 0) {
                    setSelectedCompanyId(res.data[0].id);
                    if (!initialData?.company_name) setNewCompanyName(res.data[0].name);
                } else setIsNewCompany(true);
            } catch (e) {
                console.error("Error fetching companies:", e);
                setIsNewCompany(true);
            }
        };
        fetchCompanies();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobTitle.trim() || !newCompanyName.trim() && isNewCompany) {
            return;
        }
        setLoading(true);
        try {
            let finalCompanyId = selectedCompanyId;

            // 1. Create company if new
            if (isNewCompany) {
                try {
                    const compRes = await axios.post(`${API_BASE}/companies/`, {
                        name: newCompanyName,
                        sector: newCompanySector || null,
                    });
                    finalCompanyId = compRes.data.id;
                } catch {
                    // Company might already exist (unique name constraint), try to find it
                    const existingRes = await axios.get(`${API_BASE}/companies/`);
                    const existing = existingRes.data.find(
                        (c: { id: string; name: string }) => c.name.toLowerCase() === newCompanyName.toLowerCase()
                    );
                    if (existing) {
                        finalCompanyId = existing.id;
                    } else {
                        throw new Error("Failed to create or find company");
                    }
                }
            }

            // 2. Create Application
            await axios.post(`${API_BASE}/applications/`, {
                company_id: finalCompanyId,
                status,
                job_title: jobTitle.trim(),
                type,
                contract_type: initialData?.contract_type || type,
                salary_proposed: salary || null,
                location: location || null,
                remote_mode: remoteMode || null,
                publication_date: publicationDate ? new Date(publicationDate).toISOString() : null,
                scraped_at: initialData?.scraped_at || null,
                job_url: jobUrl || null,
                raw_description: rawDesc || null,
                cv_document_id: cvDocumentId || null,
                cover_letter_document_id: coverLetterDocumentId || null,
                date_sent: new Date().toISOString(),
                last_contact_date: new Date().toISOString()
            });

            onSuccess();
            onClose();
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error("Error creating application:", error);
            if (axiosError.response && axiosError.response.status === 409) {
                alert("Cette offre a déjà été ajoutée (URL identique).");
            } else {
                alert("Erreur lors de la création de la candidature.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
                    <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                            <Plus className="w-5 h-5 text-brand-500" />
                        </div>
                        Nouvelle Candidature
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="space-y-5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-5">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Champs principaux</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Intitulé du poste *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Data Engineer Alternance"
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-700"
                                    required
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                />
                                {!jobTitle.trim() && <p className="text-[10px] text-danger font-semibold">Le poste est obligatoire pour suivre efficacement la candidature.</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nom de l'entreprise *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Capgemini"
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-700"
                                    required
                                    value={newCompanyName}
                                    onChange={e => {
                                        setNewCompanyName(e.target.value);
                                        setIsNewCompany(true);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* COMPANY SECTION */}
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Détails de l'entreprise</h3>
                            <button
                                type="button"
                                onClick={() => setIsNewCompany(!isNewCompany)}
                                className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
                            >
                                {isNewCompany ? "Sélectionner existante" : "+ Créer nouvelle"}
                            </button>
                        </div>

                        {isNewCompany ? (
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nom de l'entreprise *</label>
                                    <input type="text" placeholder="Ex: Capgemini" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-700" required value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Secteur</label>
                                    <input type="text" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all" value={newCompanySector} onChange={e => setNewCompanySector(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sélectionner entreprise *</label>
                                <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all" value={selectedCompanyId} onChange={e => {
                                    setSelectedCompanyId(e.target.value);
                                    setNewCompanyName(companies.find(company => company.id === e.target.value)?.name || '');
                                }}>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-800/50 w-full"></div>

                    {/* APPLICATION SECTION */}
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Détails de la candidature</h3>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Statut *</label>
                                <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={status} onChange={e => setStatus(e.target.value as ApplicationStatus)}>
                                    <option value="Wishlist">Liste de souhaits</option>
                                    <option value="Applied">Postulé</option>
                                    <option value="Follow-up">Relance</option>
                                    <option value="Interview">Entretien</option>
                                    <option value="Technical Test">Test Technique</option>
                                    <option value="Offer">Offre</option>
                                    <option value="Rejected">Refusé</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Type *</label>
                                <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={type} onChange={e => setType(e.target.value as ApplicationType)}>
                                    <option value="Stage">Stage</option>
                                    <option value="Alternance">Alternance</option>
                                    <option value="CDI">CDI</option>
                                    <option value="CDD">CDD</option>
                                    <option value="Freelance">Freelance</option>
                                    <option value="Temps partiel">Temps partiel</option>
                                    <option value="Temps plein">Temps plein</option>
                                    <option value="Interim">Interim</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Salaire proposé (€)</label>
                                <input type="text" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={salary} onChange={e => setSalary(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Lieu / Emplacement</label>
                                <input type="text" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Remote / hybride</label>
                                <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={remoteMode} onChange={e => setRemoteMode(e.target.value)}>
                                    <option value="">Non précisé</option>
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybride</option>
                                    <option value="On-site">Sur site</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Date publication</label>
                                <input type="date" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={publicationDate} onChange={e => setPublicationDate(e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">URL de l'offre</label>
                                <input 
                                    type="url" 
                                    className={`w-full bg-slate-950 border ${urlExists ? 'border-danger' : 'border-slate-800'} text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all`} 
                                    value={jobUrl} 
                                    onChange={e => setJobUrl(e.target.value)} 
                                />
                                {urlExists && <p className="text-danger text-[10px] font-semibold mt-1.5 flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" /> Cette offre existe déjà dans votre suivi.
                                </p>}
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Description</label>
                                <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 focus:border-brand-500 focus:outline-none transition-all custom-scrollbar placeholder:text-slate-700" value={rawDesc} onChange={e => setRawDesc(e.target.value)} placeholder="Collez la description de l'offre ici..." />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800/50 w-full"></div>

                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Documents associés</h3>
                        <DocumentSelector
                            label="CV sélectionné"
                            acceptedTypes={['CV']}
                            selectedDocumentId={cvDocumentId}
                            onChange={setCvDocumentId}
                        />
                        <DocumentSelector
                            label="Lettre de motivation"
                            acceptedTypes={['Lettre motivation']}
                            selectedDocumentId={coverLetterDocumentId}
                            onChange={setCoverLetterDocumentId}
                        />
                    </div>

                    <div className="pt-4 flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                        <button type="submit" disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-brand-600/20">
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Enregistrement...</span>
                                </>
                            ) : (
                                'Enregistrer la candidature'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
