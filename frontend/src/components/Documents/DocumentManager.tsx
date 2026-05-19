import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { AxiosError } from 'axios';
import { Upload, Download, FileText, Loader2, X, Trash2 } from 'lucide-react';
import type { AppDocument, Application, DocumentType } from '../../types';
import { API_BASE } from '../../lib/api';

interface DocumentManagerProps {
    application: Application;
    onClose: () => void;
}

export function DocumentManager({ application, onClose }: DocumentManagerProps) {
    const [documents, setDocuments] = useState<AppDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<DocumentType>('CV');
    const [versionName, setVersionName] = useState('');

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setStatus(null);
        try {
            const res = await axios.get(`${API_BASE}/documents/application/${application.id}`);
            setDocuments(res.data);
        } catch (error) {
            console.error("Error fetching documents:", error);
            setStatus({ type: 'error', msg: 'Échec du chargement de la liste des documents.' });
        } finally {
            setLoading(false);
        }
    }, [application.id]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!file) {
            setStatus({ type: 'error', msg: 'Veuillez d\'abord sélectionner un fichier.' });
            return;
        }
        if (!versionName.trim()) {
            setStatus({ type: 'error', msg: 'Veuillez entrer un nom de version (ex: V1, Révisé).' });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('application_id', application.id);
        formData.append('document_type', docType);
        formData.append('display_name', versionName.trim());
        formData.append('files', file);

        try {
            console.log("Starting upload to:", `${API_BASE}/documents/upload`);
            await axios.post(`${API_BASE}/documents/upload`, formData);
            setFile(null);
            setVersionName('');
            setStatus({ type: 'success', msg: 'Document téléchargé avec succès !' });
            await fetchDocuments(); // refresh list
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            console.error("Upload error details:", axiosError.response?.data || axiosError.message);
            setStatus({ 
                type: 'error', 
                msg: axiosError.response?.data?.detail || 'L\'envoi a échoué. Vérifiez si le serveur tourne sur :8000' 
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (docId: string, filename: string) => {
        try {
            const response = await axios.get<{ url: string }>(`${API_BASE}/documents/download/${docId}`);
            const link = document.createElement('a');
            link.href = response.data.url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading document:", error);
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            await axios.delete(`${API_BASE}/documents/${docId}`);
            await fetchDocuments();
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar outline-none">
                <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <h2 className="text-xl text-white font-display font-bold flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                            <FileText className="w-5 h-5 text-brand-500" />
                        </div>
                        Documents : {application.company?.name || 'Entreprise'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Status Message */}
                    {status && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 font-medium ${
                            status.type === 'success' 
                                ? 'bg-success/10 text-success border border-success/30 shadow-sm' 
                                : 'bg-danger/10 text-danger border border-danger/30 shadow-sm'
                        }`}>
                            {status.type === 'success' ? '✓ ' : '⚠ '}
                            {status.msg}
                        </div>
                    )}

                    {/* Upload Section */}
                    <form onSubmit={handleUpload} className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/50 space-y-5">
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Nouveau Document
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all"
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                                >
                                    <option value="CV">CV</option>
                                    <option value="Lettre motivation">Lettre de Motivation</option>
                                    <option value="Portfolio">Portfolio</option>
                                    <option value="Certificat">Certificat</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nom (Version)</label>
                                <input
                                    type="text"
                                    placeholder="ex: CV_Tech_V2"
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all"
                                    value={versionName}
                                    onChange={(e) => setVersionName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fichier</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    className="w-full text-sm text-slate-400
                                    file:mr-4 file:py-2.5 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-brand-500/10 file:text-brand-400
                                    hover:file:bg-brand-500/20 file:transition-colors file:cursor-pointer
                                    cursor-pointer border border-slate-800 rounded-xl bg-slate-950 focus:outline-none"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-brand-600/20"
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {uploading ? 'ENVOI EN COURS...' : 'TÉLÉCHARGER LE DOCUMENT'}
                            </button>
                        </div>
                    </form>

                    {/* Document List */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                            <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                                Fichiers Contenus ({documents.length})
                            </h3>
                        </div>
                        
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 border-dashed p-10 flex flex-col items-center justify-center text-center">
                                <FileText className="w-10 h-10 text-slate-700 mb-3" />
                                <p className="text-slate-400 font-medium">Aucun document n'a été ajouté.</p>
                                <p className="text-slate-500 text-sm mt-1">Uploadez votre CV ou LM ci-dessus.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {documents.map(doc => (
                                    <div key={doc.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-brand-500/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-700 group-hover:bg-brand-500/10 group-hover:border-brand-500/30 transition-colors">
                                                <FileText className="w-5 h-5 text-slate-400 group-hover:text-brand-400 transition-colors" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-bold text-slate-200">{doc.document_type}</span>
                                                    <span className="text-slate-500 text-xs px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700">{doc.display_name}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-[300px]">
                                                    {doc.original_filename}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.original_filename || 'telechargement')}
                                                className="p-2.5 text-slate-400 hover:text-brand-400 bg-slate-900 border border-slate-800 hover:border-brand-500/30 rounded-lg transition-all shadow-sm"
                                                title="Télécharger"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="p-2.5 text-slate-400 hover:text-danger hover:bg-danger/10 bg-slate-900 border border-slate-800 hover:border-danger/30 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
