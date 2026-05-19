import { Building2, Calendar, DollarSign, Edit3, ExternalLink, FileText, MapPin, X } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ReactNode } from 'react';
import type { Application } from '../../types';

interface ApplicationDetailModalProps {
    application: Application;
    onClose: () => void;
    onEdit: () => void;
}

export function ApplicationDetailModal({ application, onClose, onEdit }: ApplicationDetailModalProps) {
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
        } catch {
            return dateStr;
        }
    };

    const publicationAge = application.publication_date
        ? formatDistanceToNowStrict(new Date(application.publication_date), { addSuffix: true, locale: fr })
        : null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={(event) => event.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                            <div className="p-2 bg-brand-500/10 rounded-lg">
                                <Building2 className="w-5 h-5 text-brand-500" />
                            </div>
                            {application.company?.name || 'Entreprise inconnue'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide">Identifiant: {application.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Modifier">
                            <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Poste</p>
                        <h3 className="text-2xl text-white font-display font-bold">{application.job_title || 'Poste sans titre'}</h3>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg border text-slate-300 border-slate-700 bg-slate-800 uppercase tracking-wider">
                            {application.status}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                            {application.type}
                        </span>
                        {application.remote_mode && (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20 uppercase tracking-wider">
                                {application.remote_mode}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <Info icon={<DollarSign className="w-4 h-4 text-slate-500" />} label="Salaire" value={application.salary_proposed || '—'} />
                        <Info icon={<MapPin className="w-4 h-4 text-slate-500" />} label="Lieu" value={application.location || '—'} />
                        <Info icon={<Calendar className="w-4 h-4 text-slate-500" />} label="Date candidature" value={formatDate(application.date_sent)} />
                        <Info icon={<Calendar className="w-4 h-4 text-slate-500" />} label="Publication offre" value={publicationAge ? `${formatDate(application.publication_date)} (${publicationAge})` : '—'} />
                    </div>

                    {(application.cv_document || application.cover_letter_document) && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Documents associés
                            </div>
                            <div className="space-y-2 text-sm text-slate-300">
                                {application.cv_document && <p>CV : {application.cv_document.display_name}</p>}
                                {application.cover_letter_document && <p>Lettre : {application.cover_letter_document.display_name}</p>}
                            </div>
                        </div>
                    )}

                    {application.job_url && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                                Source
                            </div>
                            <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 hover:text-brand-300 hover:underline break-all transition-colors">
                                {application.job_url}
                            </a>
                        </div>
                    )}

                    {application.raw_description && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Description / notes
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar pr-3">
                                    {application.raw_description}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                {icon}
                {label}
            </div>
            <p className="text-sm text-slate-200 font-medium">{value}</p>
        </div>
    );
}
