"use client";

import type { BuilderStep } from "./types";

const STEPS: Array<{ num: BuilderStep; label: string }> = [
  { num: 1, label: "Customer" },
  { num: 2, label: "Build Tiers" },
  { num: 3, label: "Add-Ons" },
  { num: 4, label: "Financing" },
  { num: 5, label: "Review & Send" },
];

interface Props {
  activeStep: BuilderStep;
  completedSteps: Set<number>;
  onStepClick: (step: BuilderStep) => void;
}

export default function QuoteBuilderSteps({ activeStep, completedSteps, onStepClick }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-7 flex items-center gap-0 h-11 shrink-0">
      {STEPS.map((step, idx) => {
        const isActive = activeStep === step.num;
        const isDone = completedSteps.has(step.num) && !isActive;

        return (
          <div key={step.num} className="flex items-center">
            {idx > 0 && (
              <span className="mx-2 text-gray-300 dark:text-gray-600 text-xs">›</span>
            )}
            <button
              onClick={() => onStepClick(step.num)}
              className={`flex items-center gap-2 h-11 border-b-2 text-xs font-bold tracking-wide transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : isDone
                    ? "border-transparent text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
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
