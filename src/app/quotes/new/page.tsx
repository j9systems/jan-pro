"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteStore } from "@/lib/store";
import { ProspectStep } from "@/components/quote-wizard/prospect-step";
import { FacilityStep } from "@/components/quote-wizard/facility-step";
import { AreasStep } from "@/components/quote-wizard/areas-step";
import { AddOnsStep } from "@/components/quote-wizard/addons-step";
import { SummaryStep } from "@/components/quote-wizard/summary-step";
import { ReviewStep } from "@/components/quote-wizard/review-step";

const STEPS = [
  { label: "Prospect", component: ProspectStep },
  { label: "Facility", component: FacilityStep },
  { label: "Areas", component: AreasStep },
  { label: "Add-Ons", component: AddOnsStep },
  { label: "Summary", component: SummaryStep },
  { label: "Review", component: ReviewStep },
];

export default function NewQuotePage() {
  const router = useRouter();
  const quote = useQuoteStore((s) => s.currentQuote);
  const currentStep = useQuoteStore((s) => s.currentStep);
  const setStep = useQuoteStore((s) => s.setStep);
  const initNewQuote = useQuoteStore((s) => s.initNewQuote);
  const saveQuote = useQuoteStore((s) => s.saveQuote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  useEffect(() => {
    if (!quote) {
      initNewQuote();
    }
  }, [quote, initNewQuote]);

  if (!quote) return null;

  const StepComponent = STEPS[currentStep].component;

  const handleBack = () => {
    if (currentStep > 0) setStep(currentStep - 1);
  };

  const handleContinue = () => {
    if (currentStep < STEPS.length - 1) {
      setStep(currentStep + 1);
    }
  };

  const handleSaveAndPresent = async () => {
    updateQuote({ status: "presented" });
    await saveQuote();
    router.push(`/quotes/${quote.id}/present`);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Step Header */}
      <div className="mb-8">
        {/* Progress bar */}
        <div className="h-1 bg-muted/60 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-janpro-navy to-janpro-cyan rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {STEPS.map((step, index) => (
            <button
              key={step.label}
              type="button"
              onClick={() => setStep(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                index === currentStep
                  ? "bg-janpro-navy text-white shadow-glow"
                  : index < currentStep
                  ? "bg-janpro-cyan/10 text-janpro-cyan hover:bg-janpro-cyan/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {index < currentStep ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  index === currentStep
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[500px] animate-fadeIn" key={currentStep}>
        <StepComponent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/40">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSaveAndPresent}
              size="lg"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Save & Present
            </Button>
          ) : (
            <Button
              onClick={handleContinue}
              size="lg"
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
