import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { ChevronRight, ChevronLeft, Check, AlertCircle, Info, ExternalLink, Loader2 } from "lucide-react";
import guideImage1 from "@/assets/stock_images/guide_1.png";
import guideImage2 from "@/assets/stock_images/guide_2.png";

export function InstructionGuide({ onComplete }) {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSteps, setTranslatedSteps] = useState(null);

  useEffect(() => {
    async function translateSteps() {
      if (language === 'en') {
        setTranslatedSteps(null);
        return;
      }

      // Check if hardcoded
      const isHardcoded = t.title && t.title !== "CODE GETTER";
      if (isHardcoded) {
        setTranslatedSteps(null);
        return;
      }

      setIsTranslating(true);
      try {
        const textsToTranslate = [
          t.guide.welcome,
          t.guide.welcomeSubtitle,
          t.guide.partATitle,
          t.guide.partAStep1,
          t.guide.partAStep2,
          t.guide.partAStep3,
          t.guide.partAStep4,
          t.guide.partBTitle,
          t.guide.partBStep1,
          t.guide.partBStep2,
          t.guide.partBStep3,
          t.guide.partBStep4,
          t.guide.troubleshootingTitle,
          t.guide.troubleshootingMethod1,
          t.guide.troubleshootingMethod2,
          t.guide.troubleshootingFooter,
          t.guide.gotIt,
          "Click next"
        ];

        const promises = textsToTranslate.map(async (text) => {
          if (!text) return "";
          try {
            const res = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${language}&dt=t&q=${encodeURIComponent(text)}`
            );
            const data = await res.json();
            return data[0].map(item => item[0]).join("");
          } catch (err) {
            return text;
          }
        });

        const results = await Promise.all(promises);
        setTranslatedSteps({
          welcome: results[0],
          welcomeSubtitle: results[1],
          partATitle: results[2],
          partAStep1: results[3],
          partAStep2: results[4],
          partAStep3: results[5],
          partAStep4: results[6],
          partBTitle: results[7],
          partBStep1: results[8],
          partBStep2: results[9],
          partBStep3: results[10],
          partBStep4: results[11],
          troubleshootingTitle: results[12],
          troubleshootingMethod1: results[13],
          troubleshootingMethod2: results[14],
          troubleshootingFooter: results[15],
          gotIt: results[16],
          clickNext: results[17]
        });
      } catch (err) {
        console.error("Guide translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    }
    translateSteps();
  }, [language, t]);

  const steps = [
    {
      title: translatedSteps?.welcome || t.guide.welcome,
      subtitle: translatedSteps?.welcomeSubtitle || t.guide.welcomeSubtitle,
      content: [],
      image: guideImage1,
      type: "intro"
    },
    {
      title: "Instructions",
      sections: [
        {
          title: translatedSteps?.partATitle || t.guide.partATitle,
          content: [
            translatedSteps?.partAStep1 || t.guide.partAStep1,
            translatedSteps?.partAStep2 || t.guide.partAStep2,
            translatedSteps?.partAStep3 || t.guide.partAStep3,
            translatedSteps?.partAStep4 || t.guide.partAStep4
          ]
        },
        {
          title: translatedSteps?.partBTitle || t.guide.partBTitle,
          content: [
            translatedSteps?.partBStep1 || t.guide.partBStep1,
            translatedSteps?.partBStep2 || t.guide.partBStep2,
            translatedSteps?.partBStep3 || t.guide.partBStep3,
            translatedSteps?.partBStep4 || t.guide.partBStep4
          ]
        }
      ],
      image: guideImage2,
      type: "multi-steps"
    },
    {
      title: translatedSteps?.troubleshootingTitle || t.guide.troubleshootingTitle,
      content: [
        translatedSteps?.troubleshootingMethod1 || t.guide.troubleshootingMethod1,
        translatedSteps?.troubleshootingMethod2 || t.guide.troubleshootingMethod2,
        translatedSteps?.troubleshootingFooter || t.guide.troubleshootingFooter
      ],
      image: guideImage2,
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
    const urlRegex = /(https?:\/\/[^\s]+|netflix-code-finder\.vercel\.app)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part && part.match(urlRegex)) {
        const url = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-bold underline decoration-red-500/30 underline-offset-4 transition-all hover:decoration-red-500 cursor-pointer relative z-[110]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            {part.match(/netflix-code-finder\.vercel\.app/) ? (translatedSteps?.clickNext || "Click next") : part.replace(/^https?:\/\//, '')}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl"
      >
        <Card className="overflow-hidden border-none bg-card/95 flex-1 flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="relative w-full md:w-2/5 bg-neutral-900 flex items-center justify-center overflow-hidden min-h-[200px] md:min-h-0 border-b md:border-b-0 md:border-r border-border/50">
              <AnimatePresence mode="wait">
                <motion.img
                  key={step}
                  src={steps[step].image}
                  alt={steps[step].title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-contain p-4 md:p-6"
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
            
            <div className="w-full md:w-3/5 p-4 sm:p-6 md:p-8 flex flex-col bg-card overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-lg md:text-xl font-bold mb-3 text-primary leading-tight uppercase tracking-wide flex items-center gap-2">
                    {steps[step].title}
                    {isTranslating && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                  </h2>
                  
                  {steps[step].subtitle && (
                    <p className="text-muted-foreground mb-4 text-xs md:text-sm italic border-l-4 border-primary/30 pl-3 py-1 bg-primary/5 rounded-r">
                      {formatText(steps[step].subtitle)}
                    </p>
                  )}

                  <div className="space-y-4">
                    {steps[step].type === "multi-steps" ? (
                      steps[step].sections.map((section, idx) => (
                        <div key={idx} className="space-y-3">
                          <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">{section.title}</h3>
                          <div className="space-y-2">
                            {section.content.map((text, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                                    {formatText(text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      steps[step].content.map((text, i) => (
                        <div key={i} className="flex gap-2 items-start bg-neutral-900/40 p-2 rounded border border-neutral-800/50">
                          {steps[step].type === "troubleshoot" ? (
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          )}
                          <div className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                            {formatText(text)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
              
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1.5 min-w-[100px] shadow-lg shadow-primary/20 h-8 text-xs font-bold"
                >
                  {step === steps.length - 1 ? (
                    <>
                      {translatedSteps?.gotIt || t.guide.gotIt}
                      <Check className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}