import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Application } from '../../types';
import axios from 'axios';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Edit3, ExternalLink, Flag, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { DocumentManager } from '../Documents/DocumentManager';
import { ApplicationDetailModal } from '../Modals/ApplicationDetailModal';
import { ApplicationEditModal } from '../Modals/ApplicationEditModal';
import { API_BASE } from '../../lib/api';

interface ApplicationCardProps {
    application: Application;
    onRefresh: () => void;
    isOverlay?: boolean;
}



export function ApplicationCard({ application, onRefresh, isOverlay = false }: ApplicationCardProps) {
    const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: application.id, 
        data: { ...application },
        animateLayoutChanges: () => true,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${API_BASE}/applications/${application.id}`);
            onRefresh();
        } catch (error) {
            console.error("Failed to delete application:", error);
        }
    };

    const handleToggleFlag = async () => {
        try {
            await axios.put(`${API_BASE}/applications/${application.id}`, {
                is_flagged: !application.is_flagged
            });
            onRefresh();
        } catch (error) {
            console.error("Failed to toggle flag:", error);
        }
    };

    const decodeHTML = (html: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };

    const publicationAge = application.publication_date
        ? `Publié ${formatDistanceToNowStrict(new Date(application.publication_date), { addSuffix: true, locale: fr })}`
        : null;

    return (
        <>
            <div
                ref={isOverlay ? undefined : setNodeRef}
                style={isOverlay ? undefined : style}
                {...(isOverlay ? {} : attributes)}
                {...(isOverlay ? {} : listeners)}
                onClick={() => setIsDetailOpen(true)}
                className={`group relative rounded-2xl border border-white/10 bg-white/[0.045] p-4 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/35 hover:bg-white/[0.065] focus-visible:ring-2 focus-visible:ring-brand-500/60 ${isOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab active:cursor-grabbing'} ${isDragging && !isOverlay ? 'scale-95 opacity-30 shadow-none' : 'opacity-100 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10'}`}
            >
                {application.is_flagged && (
                    <div className="absolute top-3 right-3">
                        <div className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                    </div>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen((value) => !value);
                    }}
                    className="absolute top-3 right-3 p-1.5 text-slate-600 hover:text-slate-200 hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Actions"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-3 top-11 z-20 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-1" onClick={(event) => event.stopPropagation()}>
                        <button onClick={() => { setIsEditOpen(true); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2">
                            <Edit3 className="w-3.5 h-3.5" /> Modifier
                        </button>
                        <button onClick={() => { setIsDocumentManagerOpen(true); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> Documents
                        </button>
                        {application.job_url && (
                            <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2">
                                <ExternalLink className="w-3.5 h-3.5" /> Source
                            </a>
                        )}
                    </div>
                )}

                <div className="flex flex-col mb-4">
                    <h4 className="text-slate-100 font-display font-bold text-base tracking-tight mb-1 group-hover:text-brand-500 transition-colors">
                        {decodeHTML(application.job_title || 'Poste sans titre')}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold mb-2">{decodeHTML(application.company?.name || 'Entreprise inconnue')}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-brand-500/10 text-cyan-200 uppercase tracking-wider border border-brand-500/10">
                            {application.type}
                        </span>
                        {application.company?.sector && (
                            <span className="text-[10px] font-medium text-slate-500">
                                {application.company.sector}
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5 mb-3">
                    {publicationAge && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {publicationAge}
                        </div>
                    )}
                    {application.remote_mode && (
                        <div className="text-[11px] text-slate-500">{application.remote_mode}</div>
                    )}
                    {application.cv_document && (
                        <div className="text-[11px] text-brand-400 truncate">CV : {application.cv_document.display_name}</div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-500">
                            {formatDistanceToNow(new Date(application.last_contact_date), { addSuffix: true, locale: fr })}
                        </span>
                    </div>

                    <div className="flex gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFlag();
                            }}
                            className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${application.is_flagged ? 'text-danger' : 'text-slate-600'}`}
                            title="Marquer comme prioritaire"
                        >
                            <Flag className="w-3.5 h-3.5" fill={application.is_flagged ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-brand-500 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Modifier"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDocumentManagerOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-brand-500 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Changer documents"
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Supprimer cette candidature ?')) {
                                    handleDelete();
                                }
                            }}
                            className="p-1.5 text-slate-600 hover:text-danger hover:bg-slate-800 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {isDocumentManagerOpen && (
                <DocumentManager
                    application={application}
                    onClose={() => setIsDocumentManagerOpen(false)}
                />
            )}

            {isDetailOpen && (
                <ApplicationDetailModal
                    application={application}
                    onClose={() => setIsDetailOpen(false)}
                    onEdit={() => {
                        setIsDetailOpen(false);
                        setIsEditOpen(true);
                    }}
                />
            )}

            {isEditOpen && (
                <ApplicationEditModal
                    application={application}
                    onClose={() => setIsEditOpen(false)}
                    onSaved={onRefresh}
                />
            )}
        </>
    );
}
