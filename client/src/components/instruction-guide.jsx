import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import guideImage1 from "@/assets/stock_images/modern_clean_technol_154b19b4.jpg";
import guideImage2 from "@/assets/stock_images/modern_clean_technol_d3ff6f41.jpg";
import guideImage3 from "@/assets/stock_images/modern_clean_technol_2270c004.jpg";

export function InstructionGuide({ onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t.guide.step1Title,
      description: t.guide.step1Desc,
      image: guideImage1
    },
    {
      title: t.guide.step2Title,
      description: t.guide.step2Desc,
      image: guideImage2
    },
    {
      title: t.guide.step3Title,
      description: t.guide.step3Desc,
      image: guideImage3
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl"
      >
        <Card className="overflow-hidden border-none shadow-2xl bg-card/95">
          <CardContent className="p-0">
            <div className="relative h-64 sm:h-80 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={step}
                  src={steps[step].image}
                  alt={steps[step].title}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h2 className="text-2xl font-bold mb-1">{steps[step].title}</h2>
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {steps[step].description}
              </p>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                
                <Button
                  onClick={handleNext}
                  className="gap-2 min-w-[120px]"
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
    </div>
  );
}
