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
    const { setNodeRef } = useDroppable({
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
        <div className="flex flex-col flex-1 min-w-[320px] h-full bg-slate-900/20 border-r border-slate-800/50 last:border-r-0">
            <div className="px-5 py-4 flex justify-between items-center bg-slate-900/40 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800/50">
                <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full bg-${colorClass === 'cyber-warning' ? 'warning' : colorClass === 'cyber-blue' ? 'info' : colorClass === 'cyber-green' ? 'success' : colorClass === 'cyber-alert' ? 'danger' : 'slate-500'}`}></div>
                    <h3 className="font-display font-bold text-sm text-slate-200 tracking-tight">
                        {title}
                    </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
                    {applications.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar"
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
                    <div className="py-12 flex flex-col items-center justify-center text-slate-600 text-[11px] font-medium border-2 border-dashed border-slate-800/50 rounded-2xl mx-2">
                        Aucune candidature ici
                    </div>
                )}
            </div>
        </div>
    );
}
