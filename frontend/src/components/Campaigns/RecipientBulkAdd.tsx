import { useState } from 'react';

interface BulkSummary {
  created_count: number;
  duplicate_count: number;
  invalid_count: number;
  invalid_items: string[];
  duplicate_items: string[];
}

export function RecipientBulkAdd({ disabled, onSubmit }: { disabled: boolean; onSubmit: (rawText: string) => Promise<BulkSummary | null> }) {
  const [rawText, setRawText] = useState('');
  const [summary, setSummary] = useState<BulkSummary | null>(null);

  const submit = async () => {
    if (!rawText.trim()) return;
    const result = await onSubmit(rawText);
    if (result) {
      setSummary(result);
      setRawText('');
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Ajouter plusieurs emails</h3>
          <p className="text-xs text-slate-500">Collez un email par ligne, ou séparez-les par virgules / points-virgules.</p>
        </div>
        <button disabled={disabled || !rawText.trim()} onClick={submit} className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2">
          Ajouter manuellement
        </button>
      </div>
      <textarea
        disabled={disabled}
        className="mt-4 w-full min-h-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 outline-none text-white disabled:opacity-50"
        placeholder="contact@company.com, rh@entreprise.fr; recrutement@test.com"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />
      {disabled && <p className="text-sm text-warning mt-3">Vous devez enregistrer la campagne avant d’ajouter des destinataires.</p>}
      {summary && (
        <div className="text-sm text-slate-400 mt-3 space-y-1">
          <p>{summary.created_count} emails ajoutés · {summary.duplicate_count} doublons ignorés · {summary.invalid_count} invalides</p>
          {summary.invalid_items.length > 0 && <p className="text-danger">Invalides: {summary.invalid_items.join(', ')}</p>}
          {summary.duplicate_items.length > 0 && <p className="text-warning">Doublons: {summary.duplicate_items.join(', ')}</p>}
        </div>
      )}
    </section>
  );
}
