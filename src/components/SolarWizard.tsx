// src/components/SolarWizard.tsx
"use client";

import { useMemo } from "react";
import { useSolarStore } from "@/store/solarStore";
import { STEPS, getStepById, isDesignComplete } from "@/config/steps";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, AlertCircle } from "lucide-react";

export function SolarWizard() {
  const { 
    design, 
    goToNextStep, 
    goToPreviousStep, 
    canGoNext, 
    canGoBack 
  } = useSolarStore();
  
  const currentStep = useMemo(() => {
    return getStepById(design.currentStep);
  }, [design.currentStep]);
  
  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Step Not Found</h2>
          <p className="text-muted-foreground">
            Step {design.currentStep} does not exist in the configuration.
          </p>
        </div>
      </div>
    );
  }
  
  const CurrentComponent = currentStep.component;
  const isComplete = currentStep.isComplete(design);
  const canProceed = currentStep.canProceed ? currentStep.canProceed(design) : true;
  
  const handleSaveDraft = () => {
    localStorage.setItem('solar-design-draft', JSON.stringify(design));
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6 px-4">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Solar PV System Designer</h1>
            <p className="text-sm text-muted-foreground">
              Professional Edition v2.0 — Nigeria/Global Standards
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-2">
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
        </header>
        
        {/* Simple Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm">
            <span>Step {design.currentStep} of 16</span>
            <span>{Math.round((design.completedSteps.length / 16) * 100)}% Complete</span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${(design.completedSteps.length / 16) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Step content */}
        <Card className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Step {currentStep.id}: {currentStep.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentStep.subtitle}
            </p>
          </div>
          
          <div className="min-h-[400px]">
            <CurrentComponent />
          </div>
        </Card>
        
        {/* Navigation */}
        <footer className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={!canGoBack()}
            className="w-full sm:w-auto gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-4">
            {isComplete && (
              <span className="text-sm text-green-600">✓ Complete</span>
            )}
            
            {!canProceed && (
              <span className="text-sm text-destructive">Complete this step first</span>
            )}
            
            <Button
              onClick={goToNextStep}
              disabled={!canGoNext() || !canProceed}
              className="w-full sm:w-auto gap-2"
            >
              {isDesignComplete(design) ? 'Complete Design' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}