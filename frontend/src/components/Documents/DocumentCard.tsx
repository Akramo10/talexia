import axios from 'axios';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import type { AppDocument } from '../../types';
import { API_BASE } from '../../lib/api';

interface DocumentCardProps {
    document: AppDocument;
    onEdit: (document: AppDocument) => void;
    onDeleted: () => void;
}

const formatSize = (size: number) => {
    if (size < 1024) return `${size} o`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

export function DocumentCard({ document, onEdit, onDeleted }: DocumentCardProps) {
    const download = async () => {
        const response = await axios.get<{ url: string }>(`${API_BASE}/documents/download/${document.id}`);
        window.location.href = response.data.url;
    };

    const remove = async () => {
        if (!confirm('Supprimer ce document ?')) return;
        await axios.delete(`${API_BASE}/documents/${document.id}`);
        onDeleted();
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-all">
            <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <FileText className="w-5 h-5 text-brand-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-slate-100 font-bold truncate">{document.display_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                        {document.document_type} · {formatSize(document.size)} · {new Date(document.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {document.tags && <p className="text-[11px] text-slate-600 truncate mt-1">{document.tags}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(document)} className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={download} className="p-2 text-slate-500 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors" title="Télécharger">
                    <Download className="w-4 h-4" />
                </button>
                <button onClick={remove} className="p-2 text-slate-500 hover:text-danger hover:bg-slate-800 rounded-lg transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
