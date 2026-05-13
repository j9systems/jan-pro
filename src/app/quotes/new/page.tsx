"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
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

  const handleSaveAndPresent = () => {
    updateQuote({ status: "presented" });
    saveQuote();
    router.push(`/quotes/${quote.id}/present`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => setStep(index)}
              className="flex items-center gap-2 group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStep
                    ? "bg-janpro-cyan text-white"
                    : index === currentStep
                    ? "bg-janpro-navy text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-sm hidden md:inline ${
                  index === currentStep
                    ? "font-semibold text-janpro-navy"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 ${
                  index < currentStep ? "bg-janpro-cyan" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        <StepComponent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          size="lg"
        >
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button
            onClick={handleSaveAndPresent}
            size="lg"
            className="bg-janpro-navy hover:bg-janpro-navy/90"
          >
            Save & Present
          </Button>
        ) : (
          <Button
            onClick={handleContinue}
            size="lg"
            className="bg-janpro-navy hover:bg-janpro-navy/90"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
