import { useEffect, useState } from 'react';
import axios from 'axios';
import { FilePlus2, FileText, Loader2 } from 'lucide-react';
import type { AppDocument, DocumentType } from '../../types';
import { API_BASE } from '../../lib/api';
import { DocumentCard } from './DocumentCard';
import { UploadDocumentModal } from './UploadDocumentModal';

export function DocumentLibrary() {
    const [documents, setDocuments] = useState<AppDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editing, setEditing] = useState<AppDocument | null>(null);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get<AppDocument[]>(`${API_BASE}/documents/`);
            setDocuments(response.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const updateDocument = async () => {
        if (!editing) return;
        await axios.put(`${API_BASE}/documents/${editing.id}`, {
            display_name: editing.display_name,
            document_type: editing.document_type,
            tags: editing.tags,
        });
        setEditing(null);
        await fetchDocuments();
    };

    return (
        <section className="bg-slate-900/30 border border-slate-800 rounded-2xl shadow-sm min-h-[700px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div>
                    <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Bibliothèque documents</h2>
                    <p className="text-xs text-slate-600 mt-1">CV, lettres de motivation, portfolios et certificats stockés dans S3 privé.</p>
                </div>
                <button onClick={() => setIsUploadOpen(true)} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <FilePlus2 className="w-4 h-4" />
                    Ajouter un document
                </button>
            </div>
            <div className="p-6">
                {loading ? (
                    <div className="h-80 flex items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-950/30">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-6 h-6 text-brand-400" />
                        </div>
                        <h3 className="text-white font-display font-bold mb-2">Aucun document ajouté</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Téléversez vos CV et lettres de motivation pour les réutiliser rapidement dans vos candidatures.
                        </p>
                        <button onClick={() => setIsUploadOpen(true)} className="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold transition-colors">
                            Ajouter un document
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {documents.map(document => (
                            <DocumentCard key={document.id} document={document} onEdit={setEditing} onDeleted={fetchDocuments} />
                        ))}
                    </div>
                )}
            </div>

            {isUploadOpen && <UploadDocumentModal onClose={() => setIsUploadOpen(false)} onUploaded={fetchDocuments} />}

            {editing && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-white font-display font-bold text-lg">Modifier le document</h3>
                        <input className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={editing.display_name} onChange={(event) => setEditing({ ...editing, display_name: event.target.value })} />
                        <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={editing.document_type} onChange={(event) => setEditing({ ...editing, document_type: event.target.value as DocumentType })}>
                            <option value="CV">CV</option>
                            <option value="Lettre motivation">Lettre motivation</option>
                            <option value="Portfolio">Portfolio</option>
                            <option value="Certificat">Certificat</option>
                            <option value="Autre">Autre</option>
                        </select>
                        <input className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Tags" value={editing.tags || ''} onChange={(event) => setEditing({ ...editing, tags: event.target.value })} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-500 hover:text-white">Annuler</button>
                            <button onClick={updateDocument} className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold">Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
