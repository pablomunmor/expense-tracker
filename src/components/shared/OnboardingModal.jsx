import React, { useState } from 'react';
import { DollarSign, ChevronRight, RotateCcw, Upload, X } from 'lucide-react';

const OnboardingModal = ({ onClose }) => {
    const [step, setStep] = useState(0);
    const steps = [
        {
            title: 'Plan by Paycheck',
            icon: DollarSign,
            body: 'Your expenses are organized into A/B paychecks every two weeks. Net shows income minus expenses for that paycheck.'
        },
        {
            title: 'Move Single Instances',
            icon: ChevronRight,
            body: 'Use arrow buttons on a card to move just that instance to next/previous paycheck. Template remains unchanged.'
        },
        {
            title: 'Instant Actions + Undo',
            icon: RotateCcw,
            body: 'No confirmation dialogs. Mark as Paid/Cleared instantly; use Undo if needed.'
        },
        {
            title: 'One-Offs & Sync',
            icon: Upload,
            body: 'Add one-off items per paycheck. Optionally connect a sync file for automatic saves.'
        }
    ];
    const StepIcon = steps[step].icon;

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboard-title"
        >
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border p-5 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <StepIcon className="w-5 h-5 text-blue-600" />
                        <h3 id="onboard-title" className="text-lg font-semibold">
                            {steps[step].title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded hover:bg-gray-100"
                        aria-label="Close onboarding"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-gray-700 mb-4">{steps[step].body}</p>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                    {step === 0 && (
                        <>
                            <li>• A/B chip shows which paycheck you’re on.</li>
                            <li>• Net Income updates as you add/move items.</li>
                        </>
                    )}
                    {step === 1 && (
                        <>
                            <li>• Moves persist across refreshes.</li>
                            <li>• Template stays intact; only this instance changes.</li>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <li>• Actions are instant; use the Undo button in the header.</li>
                            <li>• Look for the green toast confirming the change.</li>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <li>• Add one-offs from each period’s header.</li>
                            <li>• Connect a sync file (when supported) for auto-save.</li>
                        </>
                    )}
                </ul>
                <div className="flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200"
                    >
                        Skip
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            disabled={step === 0}
                            className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                            Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                                className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                            >
                                Get started
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
