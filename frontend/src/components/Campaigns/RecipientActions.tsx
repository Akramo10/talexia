import { FileUp, Plus, Trash2, Upload } from 'lucide-react';

interface RecipientActionsProps {
  selectedCount: number;
  onImport: (file: File | null) => void;
  onAttachment: (file: File | null) => void;
  onAdd: () => void;
  onBulkDelete: () => void;
}

export function RecipientActions({ selectedCount, onImport, onAttachment, onAdd, onBulkDelete }: RecipientActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
      <button onClick={onAdd} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-2xl px-4 py-3 flex items-center gap-2 shadow-lg shadow-brand-600/10">
        <Plus className="w-4 h-4" /> Ajouter
      </button>
      <label className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-2xl px-4 py-3 flex items-center gap-2 cursor-pointer">
        <Upload className="w-4 h-4" /> Import CSV/Excel
        <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => onImport(e.target.files?.[0] ?? null)} />
      </label>
      <label className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-2xl px-4 py-3 flex items-center gap-2 cursor-pointer">
        <FileUp className="w-4 h-4" /> Ajouter CV/LM
        <input type="file" className="hidden" onChange={(e) => onAttachment(e.target.files?.[0] ?? null)} />
      </label>
      <button onClick={onBulkDelete} disabled={selectedCount === 0} className="bg-danger/90 hover:bg-danger disabled:opacity-50 text-white font-semibold rounded-2xl px-4 py-3 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> Supprimer ({selectedCount})
      </button>
    </div>
  );
}
