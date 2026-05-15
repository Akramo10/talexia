import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Application } from '../../types';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, Flag, FileText } from 'lucide-react';
import { DocumentManager } from '../Documents/DocumentManager';
import { ApplicationDetailModal } from '../Modals/ApplicationDetailModal';
import { API_BASE } from '../../lib/api';

interface ApplicationCardProps {
    application: Application;
    onRefresh: () => void;
    isOverlay?: boolean;
}



export function ApplicationCard({ application, onRefresh, isOverlay = false }: ApplicationCardProps) {
    const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: application.id, 
        data: { ...application }
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

    return (
        <>
            <div
                ref={isOverlay ? undefined : setNodeRef}
                style={isOverlay ? undefined : style}
                {...(isOverlay ? {} : attributes)}
                {...(isOverlay ? {} : listeners)}
                onClick={() => setIsDetailOpen(true)}
                className={`group relative bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition-all duration-200 ${isOverlay ? 'cursor-grabbing shadow-2xl' : 'cursor-grab active:cursor-grabbing'} ${isDragging && !isOverlay ? 'opacity-30 scale-95 shadow-none' : 'opacity-100 shadow-sm hover:shadow-md'}`}
            >
                {application.is_flagged && (
                    <div className="absolute top-3 right-3">
                        <div className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                    </div>
                )}

                <div className="flex flex-col mb-4">
                    <h4 className="text-slate-100 font-display font-bold text-base tracking-tight mb-1 group-hover:text-brand-500 transition-colors">
                        {decodeHTML(application.company?.name || 'Inconnue')}
                    </h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                            {application.type}
                        </span>
                        {application.company?.sector && (
                            <span className="text-[10px] font-medium text-slate-500">
                                {application.company.sector}
                            </span>
                        )}
                    </div>
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
                                setIsDocumentManagerOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-brand-500 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Documents"
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
                />
            )}
        </>
    );
}
