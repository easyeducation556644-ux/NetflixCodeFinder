import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2, Volume2, VolumeX, MousePointer2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

// Translation cache
const translationCache = new Map();

async function translateSingle(text, targetLang) {
  if (!text || text.trim() === "" || targetLang === 'en') return text;
  
  const cacheKey = `${text}-${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    const translated = data[0].map(item => item[0]).join("");
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}

// Voice Guide Mouse Component
function VoiceGuideMouse({ isEnabled, currentStep, language, onStepComplete, emailValue }) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const updateIntervalRef = useRef(null);
  const targetElementRef = useRef(null);
  const hasSpokenRef = useRef(false);

  const steps = {
    input: { message: "Enter your Netflix email address here", icon: "📧" },
    button: { message: "Click this button to search for your email", icon: "🔍" },
    noResult: { message: "No email found. Please try again with a different email address.", icon: "❌" },
    link: { message: "Click this link to get your verification code", icon: "🔗" }
  };

  // Translate message
  useEffect(() => {
    if (!isEnabled || !currentStep) {
      setTranslatedMessage('');
      return;
    }

    async function translate() {
      const msg = steps[currentStep]?.message || '';
      const translated = await translateSingle(msg, language);
      setTranslatedMessage(translated);
    }
    translate();
  }, [currentStep, language, isEnabled]);

  // Auto-switch to button when valid email
  useEffect(() => {
    if (!isEnabled || currentStep !== 'input' || !emailValue) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailValue)) {
      const timer = setTimeout(() => {
        if (onStepComplete) onStepComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [emailValue, currentStep, isEnabled, onStepComplete]);

  // Speak function with multilingual support
  const speak = (text) => {
    if (!text || !isEnabled) return;

    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const langMap = {
          'bn': 'bn-IN', 'hi': 'hi-IN', 'es': 'es-ES',
          'fr': 'fr-FR', 'de': 'de-DE', 'ar': 'ar-SA',
          'pt': 'pt-PT', 'ko': 'ko-KR', 'it': 'it-IT', 'en': 'en-US'
        };
        
        const targetLang = langMap[language] || 'en-US';
        utterance.lang = targetLang;
        
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          let voice = voices.find(v => v.lang === targetLang) ||
                      voices.find(v => v.lang.startsWith(language));
          
          if (voice) utterance.voice = voice;
          
          utterance.rate = 0.85;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => {
            setIsSpeaking(false);
            hasSpokenRef.current = true;
            resolve();
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            resolve();
          };

          try {
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            resolve();
          }
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
          setTimeout(loadVoices, 500);
        } else {
          loadVoices();
        }
      }, 150);
    });
  };

  // Update position
  const updatePosition = () => {
    if (!targetElementRef.current) return;
    const rect = targetElementRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + scrollTop + rect.height / 2
    });
  };

  // Main effect
  useEffect(() => {
    if (!isEnabled || !currentStep) {
      setIsVisible(false);
      targetElementRef.current = null;
      hasSpokenRef.current = false;
      return;
    }

    let targetElement = null;

    if (currentStep === 'input') {
      targetElement = document.querySelector('input[type="email"]');
    } else if (currentStep === 'button') {
      targetElement = document.querySelector('button[type="submit"]');
    } else if (currentStep === 'link') {
      const checkForLink = () => {
        const allLinks = document.querySelectorAll('a[href]');
        targetElement = Array.from(allLinks).find(link => {
          const href = link.href.toLowerCase();
          return href.includes('netflix.com/account/travel/verify') ||
                 href.includes('netflix.com/account/update-primary-location');
        });

        if (targetElement) {
          targetElementRef.current = targetElement;
          updatePosition();
          setIsVisible(true);
          if (translatedMessage && !hasSpokenRef.current) {
            setTimeout(() => speak(translatedMessage), 600);
          }
        } else {
          setTimeout(checkForLink, 500);
        }
      };
      setTimeout(checkForLink, 800);
      return;
    }

    if (!targetElement) return;

    targetElementRef.current = targetElement;
    hasSpokenRef.current = false;
    setIsVisible(true);
    updatePosition();

    updateIntervalRef.current = setInterval(updatePosition, 200);

    const speakTimer = setTimeout(() => {
      if (translatedMessage && !hasSpokenRef.current) speak(translatedMessage);
    }, 600);

    return () => {
      clearTimeout(speakTimer);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [isEnabled, currentStep, translatedMessage]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  if (!isEnabled || !currentStep || !isVisible || position.x < 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <motion.div
        animate={currentStep === 'link' ? {
          x: [0, 15, 0, -15, 0],
          y: [0, -8, 0, -8, 0]
        } : { y: [0, -10, 0] }}
        transition={{
          duration: currentStep === 'link' ? 1.5 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <MousePointer2 
          className="w-10 h-10 sm:w-12 sm:h-12" 
          style={{
            fill: '#e50914',
            filter: 'drop-shadow(0 4px 12px rgba(229, 9, 20, 0.7))'
          }}
        />
        <motion.div
          animate={{ scale: [1, 2.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-red-500"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute left-full ml-2 sm:ml-3 top-1/2 -translate-y-1/2 w-[60vw] sm:w-auto sm:max-w-[280px]"
      >
        <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-2xl">
          <div className="absolute right-full top-1/2 -translate-y-1/2">
            <div className="w-0 h-0 border-t-[6px] sm:border-t-[8px] border-t-transparent border-b-[6px] sm:border-b-[8px] border-b-transparent border-r-[10px] sm:border-r-[12px] border-r-red-600" />
          </div>
          <div className="flex items-start gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base flex-shrink-0 mt-0.5">{steps[currentStep]?.icon}</span>
            <p className="text-white text-[9px] sm:text-xs font-medium leading-snug flex-1 break-words">
              {translatedMessage}
            </p>
            {isSpeaking && (
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-white flex-shrink-0" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Email content component
function EmailContent({ email, emailId, targetLanguage }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !email.rawHtml) return;
    containerRef.current.innerHTML = email.rawHtml;
  }, [email.rawHtml, emailId]);

  return (
    <div className="w-full relative">
      <style>{`
        .email-content-wrapper a {
          color: #ffffff !important;
          background-color: #e50914 !important;
          text-decoration: none !important;
          font-weight: 700 !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          display: inline-block !important;
          margin: 8px 0 !important;
          box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;
          transition: all 0.2s ease !important;
        }
        
        .email-content-wrapper a:hover {
          background-color: #c20711 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(229, 9, 20, 0.6) !important;
        }
      `}</style>

      <div 
        ref={containerRef}
        className="email-content-wrapper rounded-xl overflow-hidden bg-white p-3 sm:p-4"
        style={{ wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}
      />
    </div>
  );
}

// Main component
export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(null);
  const [emailValue, setEmailValue] = useState("");

  const formSchema = useMemo(() => z.object({ email: z.string().email({ message: t.validEmailError }) }), [t]);
  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { email: "" } });

  const watchedEmail = form.watch("email");
  useEffect(() => { setEmailValue(watchedEmail); }, [watchedEmail]);

  const searchMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/findcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, targetLanguage: language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      return json;
    },
    onSuccess: (data) => {
      if (data.emails && data.emails.length > 0) {
        setResults(data);
        toast({ title: t.emailFound, description: t.foundLatestEmail });
        
        if (voiceGuideEnabled) {
          setTimeout(() => {
            setCurrentGuideStep('link');
            setTimeout(() => {
              const emailContent = document.querySelector('.email-content-wrapper');
              if (emailContent) emailContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
          }, 1500);
        }
      } else {
        throw new Error("No Netflix emails found");
      }
    },
    onError: (error) => {
      setResults(null);
      toast({ title: t.searchFailed, description: error.message, variant: "destructive" });
      
      if (voiceGuideEnabled) {
        setCurrentGuideStep('noResult');
        translateSingle(error.message, language).then(translatedError => {
          const utterance = new SpeechSynthesisUtterance(translatedError);
          const langMap = { 'bn': 'bn-IN', 'hi': 'hi-IN', 'es': 'es-ES', 'en': 'en-US' };
          utterance.lang = langMap[language] || 'en-US';
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.lang.startsWith(language));
          if (voice) utterance.voice = voice;
          window.speechSynthesis.speak(utterance);
        });
        setTimeout(() => setCurrentGuideStep('input'), 4000);
      }
    },
  });

  function onSubmit(data, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setResults(null);
    setCurrentGuideStep(null);
    searchMutation.mutate(data);
  }

  useEffect(() => {
    if (!voiceGuideEnabled) {
      setCurrentGuideStep(null);
      window.speechSynthesis.cancel();
      return;
    }
    setCurrentGuideStep('input');
  }, [voiceGuideEnabled]);

  const handleGuideStepComplete = () => {
    if (currentGuideStep === 'input') {
      setTimeout(() => setCurrentGuideStep('button'), 500);
    }
  };

  const handleVoiceToggle = () => {
    const newState = !voiceGuideEnabled;
    setVoiceGuideEnabled(newState);
    if (!newState) {
      window.speechSynthesis.cancel();
      setCurrentGuideStep(null);
    }
  };

  // Re-fetch when language changes
  useEffect(() => {
    if (results && form.getValues('email')) {
      searchMutation.mutate({ email: form.getValues('email') });
    }
  }, [language]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 sm:p-4 bg-neutral-950 relative overflow-x-hidden">
      <AnimatePresence>
        {voiceGuideEnabled && currentGuideStep && (
          <VoiceGuideMouse
            isEnabled={voiceGuideEnabled}
            currentStep={currentGuideStep}
            language={language}
            onStepComplete={handleGuideStepComplete}
            emailValue={emailValue}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl space-y-4 sm:space-y-6 py-4 sm:py-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-wider font-display">{t.title}</h1>
          <p className="text-neutral-500 text-sm">{t.subtitle}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 rounded-xl p-4 sm:p-6 border border-neutral-800"
        >
          <div className="text-center mb-5">
            <h2 className="text-base sm:text-lg font-medium text-white">{t.findLatestEmail}</h2>
            <p className="text-neutral-500 text-xs mt-1">{t.enterEmailDescription}</p>
          </div>

          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(e); }} className="space-y-4 notranslate" translate="no">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm sm:text-base font-bold">{t.enterNetflixEmail}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input placeholder={t.emailPlaceholder} className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div className="flex items-center gap-2">
                  {voiceGuideEnabled ? <Volume2 className="w-4 h-4 text-green-500" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
                  <span className="text-xs sm:text-sm text-neutral-300">Voice Guide</span>
                </div>
                <button type="button" onClick={handleVoiceToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceGuideEnabled ? 'bg-green-600' : 'bg-neutral-600'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceGuideEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-10 rounded-lg" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t.searching}</span>
                ) : (
                  <span className="flex items-center gap-2"><Search className="h-4 w-4" />{t.findCode}</span>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-4">
              <div className="text-center"><p className="text-neutral-400 text-sm">{t.latestNetflixEmail}</p></div>
              {results.emails.map((email, idx) => (
                <motion.div key={email.id || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
                  <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center"><span className="text-white text-lg sm:text-xl font-bold">N</span></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm sm:text-base">Netflix</p>
                        <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2">{email.subject}</p>
                      </div>
                    </div>
                    <span className="text-neutral-500 text-xs flex-shrink-0 ml-2">{new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="p-2 sm:p-4"><EmailContent email={email} emailId={email.id || idx} targetLanguage={language} /></div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {searchMutation.isError && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-neutral-900 rounded-xl p-4 border border-red-900/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4 text-red-400" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-red-400 font-medium text-sm">{t.searchFailed}</h3>
                <p className="text-neutral-500 text-xs mt-0.5 break-words">{searchMutation.error?.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-center text-xs text-neutral-600">{t.showsLatestOnly}</p>
      </motion.div>
    </div>
  );
}
