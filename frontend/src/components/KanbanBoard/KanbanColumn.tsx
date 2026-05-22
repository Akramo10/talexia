import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Application, ApplicationStatus } from '../../types';
import { ApplicationCard } from './ApplicationCard';

interface KanbanColumnProps {
    id: ApplicationStatus;
    title: string;
    applications: Application[];
    onRefresh: () => void;
}

export function KanbanColumn({ id, title, applications, onRefresh }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    const getStatusColor = (status: ApplicationStatus) => {
        switch (status) {
            case 'Applied': return 'cyber-warning';
            case 'Follow-up': return 'cyber-blue';
            case 'Interview': return 'cyber-green';
            case 'Technical Test': return 'cyber-purple';
            case 'Rejected': return 'cyber-alert';
            case 'Offer': return 'cyber-green';
            default: return 'cyber-cyan';
        }
    };

    const colorClass = getStatusColor(id);

    const itemIds = useMemo(() => applications.map(app => app.id), [applications]);

    return (
        <div className={`flex h-full min-w-[320px] flex-1 flex-col rounded-2xl border transition-colors ${isOver ? 'border-brand-500/45 bg-brand-500/10' : 'border-white/10 bg-slate-950/20'}`}>
            <div className="px-5 py-4 flex justify-between items-center bg-slate-950/30 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full bg-${colorClass === 'cyber-warning' ? 'warning' : colorClass === 'cyber-blue' ? 'info' : colorClass === 'cyber-green' ? 'success' : colorClass === 'cyber-alert' ? 'danger' : 'cyan-400'} shadow-[0_0_18px_rgba(79,209,197,0.35)]`}></div>
                    <h3 className="font-display font-bold text-sm text-slate-200 tracking-tight">
                        {title}
                    </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/10">
                    {applications.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 space-y-4 overflow-y-auto p-4 transition-colors custom-scrollbar ${isOver ? 'bg-white/[0.035]' : ''}`}
            >
                <SortableContext
                    items={itemIds}
                    strategy={verticalListSortingStrategy}
                >
                    {applications.map((app) => (
                        <ApplicationCard key={app.id} application={app} onRefresh={onRefresh} />
                    ))}
                </SortableContext>

                {applications.length === 0 && (
                    <div className={`mx-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 text-[11px] font-medium transition-colors ${isOver ? 'border-brand-500/45 text-cyan-200' : 'border-slate-800/50 text-slate-600'}`}>
                        Aucune candidature ici
                    </div>
                )}
            </div>
        </div>
    );
}
