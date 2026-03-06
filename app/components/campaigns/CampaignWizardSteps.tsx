"use client";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS: { num: WizardStep; label: string }[] = [
  { num: 1, label: "Setup" },
  { num: 2, label: "Content" },
  { num: 3, label: "Audience" },
  { num: 4, label: "Schedule" },
  { num: 5, label: "Review" },
];

interface Props {
  activeStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

export default function CampaignWizardSteps({ activeStep, onStepClick }: Props) {
  return (
    <div className="bg-ds-card border-b border-ds-border px-7 flex items-center gap-0 h-11 shrink-0">
      {STEPS.map((step, idx) => {
        const isActive = activeStep === step.num;
        const isDone = step.num < activeStep;

        return (
          <div key={step.num} className="flex items-center">
            {idx > 0 && (
              <span className="mx-2 text-gray-300 text-xs">›</span>
            )}
            <button
              onClick={() => onStepClick(step.num)}
              className={`flex items-center gap-2 h-11 border-b-2 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                isActive
                  ? "border-ds-blue text-ds-blue"
                  : isDone
                    ? "border-transparent text-ds-green"
                    : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive
                    ? "bg-ds-blue text-white"
                    : isDone
                      ? "bg-ds-green text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? "✓" : step.num}
              </span>
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export type { WizardStep };
