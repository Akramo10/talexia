import { COLUMNS } from '../../types';
import type { Application } from '../../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
    applications: Application[];
    onRefresh: () => void;
}

export function KanbanBoard({ applications, onRefresh }: KanbanBoardProps) {
    return (
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
                <KanbanColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    applications={applications
                        .filter(app => app.status === col.id)
                        .sort((a, b) => {
                            if (a.is_flagged === b.is_flagged) return 0;
                            return a.is_flagged ? -1 : 1;
                        })
                    }
                    onRefresh={onRefresh}
                />
            ))}
        </div>
    );
}
