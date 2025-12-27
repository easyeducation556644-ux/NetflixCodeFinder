import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import guideImage1 from "@/assets/stock_images/netflix_household_up_d5854204.jpg";
import guideImage2 from "@/assets/stock_images/netflix_prompt_scree_8150a89d.jpg";
import guideImage3 from "@/assets/stock_images/netflix_device_verif_4a6cac63.jpg";

export function InstructionGuide({ onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t.guide.part1Title,
      content: [
        t.guide.part1Step1,
        t.guide.part1Step2,
        t.guide.part1Step3,
        t.guide.part1Step4
      ],
      image: guideImage1
    },
    {
      title: t.guide.part2Title,
      content: [
        t.guide.part2Step1,
        t.guide.part2Step2,
        t.guide.part2Step3,
        t.guide.part2Step4
      ],
      image: guideImage2
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
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="overflow-hidden border-none shadow-2xl bg-card/95">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-64 md:h-auto overflow-hidden bg-neutral-900">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={step}
                    src={steps[step].image}
                    alt={steps[step].title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-contain p-4"
                  />
                </AnimatePresence>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-1 justify-center">
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-white/30'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-10 flex flex-col justify-between bg-card">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 text-primary">{steps[step].title}</h2>
                  <div className="space-y-6">
                    {steps[step].content.map((text, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {i + 1}
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                          {text.split('\n')[1] || text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-10">
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
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
