import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../lib/api';

export function ExportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);

    const handleExport = async (format: 'pdf' | 'excel') => {
        setIsExporting(format);
        setIsOpen(false);
        try {
            const response = await axios.get(
                `${API_BASE}/export/${format}`,
                { responseType: 'blob' } // Important to handle binary files
            );

            // Create a Blob from the PDF/Excel Stream
            const blob = new Blob([response.data], {
                type: format === 'pdf' 
                    ? 'application/pdf' 
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Extract filename from headers if possible, or fallback manually
            const contentDisposition = response.headers['content-disposition'];
            let filename = `NEXUS_Export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch != null && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                    // Decode if utf-8
                    if (filename.startsWith("utf-8''")) {
                        filename = decodeURIComponent(filename.replace("utf-8''", ''));
                    }
                }
            }

            // Create a link to download the blob
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export data:', error);
            alert("Erreur lors de l'exportation des données.");
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting !== null}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all font-medium border border-slate-700 rounded-lg flex items-center justify-between gap-1.5 group disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-sm"
            >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" /> : <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />}
                <span>{isExporting ? `Génération...` : `Exporter`}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 left-0 mt-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black/50 z-20 flex flex-col gap-1 overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => handleExport('pdf')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left font-medium text-sm group/btn"
                        >
                            <div className="w-8 h-8 rounded-md bg-danger/10 flex items-center justify-center group-hover/btn:bg-danger/20 transition-colors">
                                <FileText className="w-4 h-4 text-danger" />
                            </div>
                            <div className="flex flex-col">
                                <span>Format PDF</span>
                                <span className="text-[10px] text-slate-500 font-normal">Bilan visuel propre</span>
                            </div>
                        </button>
                        
                        <button
                            onClick={() => handleExport('excel')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left font-medium text-sm group/btn"
                        >
                            <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center group-hover/btn:bg-success/20 transition-colors">
                                <FileSpreadsheet className="w-4 h-4 text-success" />
                            </div>
                            <div className="flex flex-col">
                                <span>Format Excel</span>
                                <span className="text-[10px] text-slate-500 font-normal">Manipulation des données</span>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
