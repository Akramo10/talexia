import { X, ExternalLink, Building2, Briefcase, Calendar, DollarSign, FileText, MapPin } from 'lucide-react';
import type { Application } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApplicationDetailModalProps {
    application: Application;
    onClose: () => void;
}

export function ApplicationDetailModal({ application, onClose }: ApplicationDetailModalProps) {
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
        } catch {
            return dateStr;
        }
    };

    const statusLabels: Record<string, string> = {
        Wishlist: 'Liste de souhaits',
        Applied: 'Postulé',
        'Follow-up': 'Relance',
        Interview: 'Entretien',
        'Technical Test': 'Test Technique',
        Offer: 'Offre',
        Rejected: 'Refusé',
    };

    const statusColor: Record<string, string> = {
        Wishlist: 'text-slate-500 border-slate-600 bg-slate-800',
        Applied: 'text-warning border-warning/30 bg-warning/10', // Jaune
        'Follow-up': 'text-info border-info/30 bg-info/10', // Bleu
        Interview: 'text-success border-success/30 bg-success/10', // Vert
        'Technical Test': 'text-purple-400 border-purple-400/30 bg-purple-400/10',
        Offer: 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10',
        Rejected: 'text-danger border-danger/30 bg-danger/10', // Rouge
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                            <div className="p-2 bg-brand-500/10 rounded-lg">
                                <Building2 className="w-5 h-5 text-brand-500" />
                            </div>
                            {application.company?.name || 'Entreprise inconnue'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide">Identifiant: {application.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Status & Type badges */}
                    <div className="flex gap-3 flex-wrap">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${statusColor[application.status] || 'text-slate-400 border-slate-600 bg-slate-800'} uppercase tracking-wider`}>
                            {statusLabels[application.status] || application.status}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                            {application.type}
                        </span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                Secteur
                            </div>
                            <p className="text-sm text-slate-200 font-medium">{application.company?.sector || '—'}</p>
                        </div>

                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <DollarSign className="w-4 h-4 text-slate-500" />
                                Salaire Proposé
                            </div>
                            <p className="text-sm text-slate-200 font-medium">
                                {application.salary_proposed ? `${application.salary_proposed}${application.salary_proposed.includes('€') ? '' : ' €'}` : '—'}
                            </p>
                        </div>

                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                Date d'envoi
                            </div>
                            <p className="text-sm text-slate-200 font-medium">{formatDate(application.date_sent)}</p>
                        </div>

                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                Lieu
                            </div>
                            <p className="text-sm text-slate-200 font-medium">{application.location || '—'}</p>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    {application.company?.tech_stack && application.company.tech_stack.length > 0 && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                                Technologies
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {application.company.tech_stack.map((tech, i) => (
                                    <span key={i} className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 shadow-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Job URL */}
                    {application.job_url && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                                Lien de l'offre
                            </div>
                            <a
                                href={application.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-brand-400 hover:text-brand-300 hover:underline break-all transition-colors"
                            >
                                {application.job_url}
                            </a>
                        </div>
                    )}

                    {/* Raw Description */}
                    {application.raw_description && (
                        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Description de l'offre
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
