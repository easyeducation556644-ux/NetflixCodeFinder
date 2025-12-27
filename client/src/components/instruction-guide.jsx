import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { ChevronRight, ChevronLeft, Check, AlertCircle, Info, ExternalLink } from "lucide-react";
import guideImage1 from "@/assets/stock_images/guide_1.png";
import guideImage2 from "@/assets/stock_images/guide_2.png";
import guideImage3 from "@/assets/stock_images/guide_3.png";

export function InstructionGuide({ onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t.guide.welcome,
      subtitle: t.guide.welcomeSubtitle,
      content: [],
      image: guideImage1,
      type: "intro"
    },
    {
      title: t.guide.partATitle,
      content: [
        t.guide.partAStep1,
        t.guide.partAStep2,
        t.guide.partAStep3,
        t.guide.partAStep4
      ],
      image: guideImage2,
      type: "steps"
    },
    {
      title: t.guide.partBTitle,
      content: [
        t.guide.partBStep1,
        t.guide.partBStep2,
        t.guide.partBStep3,
        t.guide.partBStep4
      ],
      image: guideImage3,
      type: "steps"
    },
    {
      title: t.guide.troubleshootingTitle,
      content: [
        t.guide.troubleshootingMethod1,
        t.guide.troubleshootingMethod2,
        t.guide.troubleshootingFooter
      ],
      image: guideImage3,
      type: "troubleshoot"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const formatText = (text) => {
    if (!text) return null;
    
    // Regular expression to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-bold underline decoration-primary/30 underline-offset-4 transition-all hover:decoration-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {part.replace(/^https?:\/\//, '')}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl max-h-[95vh] flex flex-col"
      >
        <Card className="overflow-hidden border-none shadow-2xl bg-card/95 flex-1 flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Image Section */}
            <div className="relative w-full md:w-1/2 bg-neutral-900 flex items-center justify-center overflow-hidden min-h-[250px] md:min-h-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={step}
                  src={steps[step].image}
                  alt={steps[step].title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-contain p-4 md:p-8"
                />
              </AnimatePresence>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Content Section */}
            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col bg-card overflow-y-auto custom-scrollbar">
              <div className="flex-1">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary leading-tight">
                    {steps[step].title}
                  </h2>
                  
                  {steps[step].subtitle && (
                    <p className="text-muted-foreground mb-6 text-sm md:text-base italic border-l-4 border-primary/30 pl-4 py-1">
                      {formatText(steps[step].subtitle)}
                    </p>
                  )}

                  <div className="space-y-6">
                    {steps[step].content.map((text, i) => (
                      <div key={i} className="group relative">
                        {steps[step].type === "steps" ? (
                          <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold shadow-sm">
                              {i + 1}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="font-semibold text-foreground text-sm md:text-base">
                                {formatText(text.split('\n')[0])}
                              </p>
                              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                {formatText(text.split('\n').slice(1).join('\n'))}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-start bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50">
                            {steps[step].type === "troubleshoot" ? (
                              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            )}
                            <div className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                              {formatText(text)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
              
              <div className="flex items-center justify-between pt-8 mt-auto border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                
                <Button
                  onClick={handleNext}
                  className="gap-2 min-w-[130px] shadow-lg shadow-primary/20"
                >
                  {step === steps.length - 1 ? (
                    <>
                      {t.guide.gotIt}
                      <Check className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
