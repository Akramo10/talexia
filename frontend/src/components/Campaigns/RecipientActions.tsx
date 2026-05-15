import { Plus, Trash2, Upload } from 'lucide-react';

interface RecipientActionsProps {
  selectedCount: number;
  onImport: (file: File | null) => void;
  onAttachment: (file: File | null) => void;
  onAdd: () => void;
  onBulkDelete: () => void;
}

export function RecipientActions({ selectedCount, onImport, onAttachment, onAdd, onBulkDelete }: RecipientActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={onAdd} className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl px-3 py-2 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Ajouter
      </button>
      <label className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer">
        <Upload className="w-4 h-4" /> Import CSV/Excel
        <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => onImport(e.target.files?.[0] ?? null)} />
      </label>
      <label className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer">
        CV/LM
        <input type="file" className="hidden" onChange={(e) => onAttachment(e.target.files?.[0] ?? null)} />
      </label>
      <button onClick={onBulkDelete} disabled={selectedCount === 0} className="bg-danger hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl px-3 py-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> Supprimer ({selectedCount})
      </button>
    </div>
  );
}
