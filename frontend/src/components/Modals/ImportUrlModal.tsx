import { useState } from 'react';
import axios from 'axios';
import { Loader2, X, Globe } from 'lucide-react';
import { API_BASE } from '../../lib/api';

interface ImportUrlModalProps {
    onClose: () => void;
    onSuccess: (data: {
        job_url: string;
        raw_description: string;
        company_name?: string;
        contract_type?: string;
        sector?: string;
        location?: string;
        salary?: string;
        description?: string;
        benefits?: string;
        job_title?: string;
    }) => void;
}

export function ImportUrlModal({ onClose, onSuccess }: ImportUrlModalProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!url) return;

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/scraper/`, { url });
            onSuccess({
                job_url: url,
                raw_description: res.data.raw_text,
                company_name: res.data.company_name || undefined,
                contract_type: res.data.contract_type || undefined,
                sector: res.data.sector || undefined,
                location: res.data.location || undefined,
                salary: res.data.salary || undefined,
                description: res.data.description || undefined,
                benefits: res.data.benefits || undefined,
                job_title: res.data.job_title || undefined,
            });
        } catch (err: unknown) {
            console.error("Scraping error:", err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.detail || "Failed to extract text from URL.");
            } else {
                setError("Failed to extract text from URL.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-brand-500" />
                        </div>
                        Importer via URL
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">URL de l'offre d'emploi</label>
                        <input
                            type="url"
                            placeholder="https://www.linkedin.com/jobs/view/..."
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-700"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                        <p className="text-[10px] text-slate-600 pl-1 font-medium">Compatible avec LinkedIn, Welcome to the Jungle, etc.</p>
                    </div>

                    {error && (
                        <div className="text-danger text-xs font-semibold border border-danger/20 rounded-xl px-4 py-3 bg-danger/5 flex items-center gap-2">
                            <span className="w-1 h-1 bg-danger rounded-full animate-pulse"></span>
                            {error}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-brand-600/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Extraction...</span>
                                </>
                            ) : (
                                'Démarrer l\'extraction'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
