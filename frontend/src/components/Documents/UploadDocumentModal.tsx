import { useState } from 'react';
import axios from 'axios';
import { FileUp, Loader2, X } from 'lucide-react';
import type { DocumentType } from '../../types';
import { API_BASE } from '../../lib/api';

interface UploadDocumentModalProps {
    onClose: () => void;
    onUploaded: () => void;
}

export function UploadDocumentModal({ onClose, onUploaded }: UploadDocumentModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [documentType, setDocumentType] = useState<DocumentType>('CV');
    const [displayName, setDisplayName] = useState('');
    const [tags, setTags] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const upload = async () => {
        if (!files.length) return;
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('document_type', documentType);
        if (displayName.trim()) formData.append('display_name', displayName.trim());
        if (tags.trim()) formData.append('tags', tags.trim());
        files.forEach(file => formData.append('files', file));
        try {
            await axios.post(`${API_BASE}/documents/upload`, formData);
            onUploaded();
            onClose();
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.detail || 'Upload impossible.' : 'Upload impossible.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                        <FileUp className="w-5 h-5 text-brand-500" />
                        Ajouter un document
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            setFiles(Array.from(event.dataTransfer.files));
                        }}
                        className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-8 text-center transition-colors bg-slate-950/40"
                    >
                        <FileUp className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-300 font-semibold">Déposez vos PDF/DOCX ici</p>
                        <p className="text-xs text-slate-600 mt-1">Taille max 10 MB par fichier</p>
                        <label className="inline-flex mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 cursor-pointer transition-colors">
                            Choisir des fichiers
                            <input type="file" multiple accept=".pdf,.docx" className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                        </label>
                    </div>
                    {files.length > 0 && <p className="text-xs text-slate-400">{files.length} fichier(s) sélectionné(s)</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)}>
                            <option value="CV">CV</option>
                            <option value="Lettre motivation">Lettre motivation</option>
                            <option value="Portfolio">Portfolio</option>
                            <option value="Certificat">Certificat</option>
                            <option value="Autre">Autre</option>
                        </select>
                        <input className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Nom personnalisé" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                    </div>
                    <input className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" placeholder="Tags optionnels" value={tags} onChange={(event) => setTags(event.target.value)} />
                    {error && <p className="text-sm text-danger font-semibold">{error}</p>}
                    <button disabled={!files.length || uploading} onClick={upload} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
                        Téléverser
                    </button>
                </div>
            </div>
        </div>
    );
}
