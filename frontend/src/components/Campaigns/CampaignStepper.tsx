import { Check } from 'lucide-react';
import type { Campaign } from './types';
import type { CampaignTab } from './CampaignTabs';

interface CampaignStepperProps {
  campaign: Campaign | null;
  active: CampaignTab;
  onStep: (tab: CampaignTab) => void;
  hasDraftContent: boolean;
}

const steps: Array<{ id: CampaignTab; label: string }> = [
  { id: 'overview', label: 'Campagne' },
  { id: 'recipients', label: 'Destinataires' },
  { id: 'email', label: 'Email' },
  { id: 'attachments', label: 'Pièces jointes' },
  { id: 'settings', label: 'Validation' },
  { id: 'logs', label: 'Envoi' },
];

export function CampaignStepper({ campaign, active, onStep, hasDraftContent }: CampaignStepperProps) {
  const completed = (step: CampaignTab) => {
    if (step === 'overview') return Boolean(campaign);
    if (step === 'recipients') return Boolean(campaign && campaign.total_recipients > 0);
    if (step === 'email') return Boolean(campaign && hasDraftContent);
    if (step === 'attachments') return Boolean(campaign && campaign.attachments.length > 0);
    if (step === 'settings') return Boolean(campaign && campaign.total_recipients > 0 && hasDraftContent);
    if (step === 'logs') return Boolean(campaign && ['scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled'].includes(campaign.status));
    return false;
  };

  return (
    <div className="sticky top-20 z-10 overflow-x-auto rounded-2xl border border-white/10 bg-[#16252D]/92 px-3 py-2 backdrop-blur-xl">
      <div className="flex min-w-max items-center gap-1">
        {steps.map((step, index) => {
          const done = completed(step.id);
          const current = active === step.id;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStep(step.id)}
                className={`flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors ${current ? 'bg-brand-600 text-white' : done ? 'bg-success/10 text-success' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${done ? 'bg-success text-white' : current ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </button>
              {index < steps.length - 1 && <span className="text-slate-700">/</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
