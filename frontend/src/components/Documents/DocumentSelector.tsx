import { useEffect, useState } from 'react';
import axios from 'axios';
import { FileUp, Loader2, RefreshCw } from 'lucide-react';
import type { AppDocument, DocumentType } from '../../types';
import { API_BASE } from '../../lib/api';

interface DocumentSelectorProps {
    label: string;
    acceptedTypes: DocumentType[];
    selectedDocumentId: string;
    onChange: (documentId: string) => void;
}

export function DocumentSelector({ label, acceptedTypes, selectedDocumentId, onChange }: DocumentSelectorProps) {
    const [documents, setDocuments] = useState<AppDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [documentType, setDocumentType] = useState<DocumentType>(acceptedTypes[0] ?? 'CV');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const responses = await Promise.all(
                acceptedTypes.map(type => axios.get<AppDocument[]>(`${API_BASE}/documents/`, { params: { document_type: type } }))
            );
            setDocuments(responses.flatMap(response => response.data));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setError('');
        setUploading(true);
        const formData = new FormData();
        formData.append('document_type', documentType);
        if (displayName.trim()) formData.append('display_name', displayName.trim());
        formData.append('files', file);
        try {
            const response = await axios.post<AppDocument[]>(`${API_BASE}/documents/upload`, formData);
            const uploaded = response.data[0];
            if (uploaded) {
                setDocuments(prev => [uploaded, ...prev]);
                onChange(uploaded.id);
            }
            setFile(null);
            setDisplayName('');
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.detail || 'Upload impossible.' : 'Upload impossible.');
        } finally {
            setUploading(false);
        }
    };

    const selected = documents.find(doc => doc.id === selectedDocumentId);

    return (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                <button type="button" onClick={fetchDocuments} className="p-1.5 text-slate-500 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors" title="Rafraîchir">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <select className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none transition-all" value={selectedDocumentId} onChange={(event) => onChange(event.target.value)}>
                <option value="">Aucun document sélectionné</option>
                {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.display_name} · {doc.document_type}</option>
                ))}
            </select>
            <div className="text-xs text-slate-500">
                {selected ? `Sélectionné : ${selected.display_name}` : 'Choisissez un document existant ou uploadez-en un nouveau.'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <input type="text" placeholder="Nom du document" className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none placeholder:text-slate-700" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                <select className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none" value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)}>
                    {acceptedTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <label className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-3 py-3 transition-colors cursor-pointer text-sm font-semibold flex items-center gap-2">
                    <FileUp className="w-4 h-4" />
                    <span className="max-w-[160px] truncate">{file ? file.name : 'PDF/DOCX'}</span>
                    <input type="file" accept=".pdf,.docx" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                </label>
            </div>
            {error && <p className="text-xs text-danger font-semibold">{error}</p>}
            <button type="button" disabled={!file || uploading} onClick={handleUpload} className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                Upload nouveau
            </button>
        </div>
    );
}
