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

// Google Translate helper with batch support
async function translateTextBatch(texts, targetLang) {
  if (!texts || texts.length === 0) return [];
  
  const results = [];
  const toTranslate = [];
  const indices = [];
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const cacheKey = `${text}-${targetLang}`;
    
    if (translationCache.has(cacheKey)) {
      results[i] = translationCache.get(cacheKey);
    } else {
      results[i] = null;
      toTranslate.push(text);
      indices.push(i);
    }
  }
  
  if (toTranslate.length === 0) return results;
  
  const batchSize = 10;
  for (let i = 0; i < toTranslate.length; i += batchSize) {
    const batch = toTranslate.slice(i, i + batchSize);
    const batchIndices = indices.slice(i, i + batchSize);
    
    const promises = batch.map(text => translateSingle(text, targetLang));
    const translated = await Promise.all(promises);
    
    for (let j = 0; j < translated.length; j++) {
      const originalText = batch[j];
      const translatedText = translated[j];
      const cacheKey = `${originalText}-${targetLang}`;
      
      translationCache.set(cacheKey, translatedText);
      results[batchIndices[j]] = translatedText;
    }
  }
  
  return results;
}

async function translateSingle(text, targetLang) {
  if (!text || text.trim() === "" || targetLang === 'en') return text;
  
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data[0].map(item => item[0]).join("");
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}

// Extract text nodes
function extractTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style') return NodeFilter.FILTER_REJECT;
        
        const text = node.nodeValue.trim();
        if (text === '') return NodeFilter.FILTER_REJECT;
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push({
      node: node,
      originalText: node.nodeValue.trim(),
      parent: node.parentElement
    });
  }

  return textNodes;
}

// Voice Guide Mouse Component
function VoiceGuideMouse({ isEnabled, currentStep, language, onStepComplete, linkRef }) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const speechRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const targetElementRef = useRef(null);

  const steps = {
    input: {
      message: "Enter your Netflix email address here",
      icon: "📧"
    },
    button: {
      message: "Click this button to search for your email",
      icon: "🔍"
    },
    noResult: {
      message: "No email found. Please try again with a different email address.",
      icon: "❌"
    },
    link: {
      message: "Click this link to get your verification code",
      icon: "🔗"
    }
  };

  // Translate message when language or step changes
  useEffect(() => {
    if (!isEnabled || !currentStep) {
      setTranslatedMessage('');
      return;
    }

    async function translate() {
      const msg = steps[currentStep]?.message || '';
      if (language === 'en') {
        setTranslatedMessage(msg);
      } else {
        const translated = await translateSingle(msg, language);
        setTranslatedMessage(translated);
      }
    }
    translate();
  }, [currentStep, language, isEnabled]);

  // Speak message - FIXED for multilingual support
  const speak = (text) => {
    if (!text || !isEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      // Small delay to ensure cancel completes
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Language mapping
        const langMap = {
          'bn': 'bn-IN',  // Changed to bn-IN for better support
          'hi': 'hi-IN',
          'es': 'es-ES',
          'fr': 'fr-FR',
          'en': 'en-US'
        };
        
        const targetLang = langMap[language] || 'en-US';
        utterance.lang = targetLang;
        
        // Get available voices
        let voices = window.speechSynthesis.getVoices();
        
        // Function to set voice
        const setVoice = () => {
          voices = window.speechSynthesis.getVoices();
          
          // Try to find voice for target language
          let voice = voices.find(v => v.lang === targetLang);
          
          // Fallback: try language code only (e.g., 'bn' instead of 'bn-IN')
          if (!voice) {
            voice = voices.find(v => v.lang.startsWith(language));
          }
          
          // Fallback: try any voice with same base language
          if (!voice && targetLang.includes('-')) {
            const baseLang = targetLang.split('-')[0];
            voice = voices.find(v => v.lang.startsWith(baseLang));
          }
          
          if (voice) {
            utterance.voice = voice;
            console.log('Using voice:', voice.name, voice.lang);
          } else {
            console.warn('No voice found for language:', targetLang);
          }
          
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1;

          utterance.onstart = () => {
            console.log('Speech started');
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            console.log('Speech ended');
            setIsSpeaking(false);
            resolve();
            if (onStepComplete) {
              setTimeout(onStepComplete, 800);
            }
          };
          
          utterance.onerror = (e) => {
            console.error('Speech error:', e);
            setIsSpeaking(false);
            resolve();
          };

          speechRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };

        // If voices not loaded yet, wait for them
        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = setVoice;
        } else {
          setVoice();
        }
      }, 100);
    });
  };

  // Update position dynamically
  const updatePosition = () => {
    if (!targetElementRef.current) return;

    const rect = targetElementRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calculate center position
    const x = rect.left + rect.width / 2;
    const y = rect.top + scrollTop + rect.height / 2;

    setPosition({ x, y });
  };

  // Main effect to handle step changes
  useEffect(() => {
    if (!isEnabled || !currentStep) {
      setIsVisible(false);
      targetElementRef.current = null;
      return;
    }

    let targetElement = null;

    // Find target element based on step
    if (currentStep === 'input') {
      targetElement = 
        document.querySelector('#email-input') || 
        document.querySelector('input[type="email"]') ||
        document.querySelector('input[name="email"]');
    } else if (currentStep === 'button') {
      targetElement = 
        document.querySelector('#search-button') ||
        document.querySelector('button[type="submit"]');
    } else if (currentStep === 'link') {
      // FIXED: Better link detection in email content
      setTimeout(() => {
        // First try to find Netflix links in email content
        const emailContainer = document.querySelector('.email-content-wrapper');
        if (emailContainer) {
          const links = emailContainer.querySelectorAll('a');
          targetElement = Array.from(links).find(link => {
            const href = link.href || '';
            const text = link.textContent || '';
            return (
              href.includes('netflix.com') || 
              href.includes('account') ||
              href.includes('verify') ||
              text.toLowerCase().includes('verify') ||
              text.toLowerCase().includes('confirm') ||
              text.toLowerCase().includes('click here')
            );
          });
        }
        
        // Fallback to any link in email
        if (!targetElement && emailContainer) {
          const allLinks = emailContainer.querySelectorAll('a[href]');
          targetElement = allLinks[0];
        }

        if (targetElement) {
          targetElementRef.current = targetElement;
          updatePosition();
          setIsVisible(true);
          
          // Speak after finding element
          if (translatedMessage) {
            setTimeout(() => speak(translatedMessage), 500);
          }
        } else {
          console.warn('Link not found in email content');
        }
      }, 500);
      return;
    }

    if (!targetElement) {
      console.warn('Target element not found for step:', currentStep);
      setIsVisible(false);
      return;
    }

    targetElementRef.current = targetElement;
    
    // Set visible and update position
    setIsVisible(true);
    updatePosition();

    // Start position update interval
    updateIntervalRef.current = setInterval(updatePosition, 200);

    // Speak after short delay
    const speakTimer = setTimeout(() => {
      if (translatedMessage) {
        speak(translatedMessage);
      }
    }, 800);

    return () => {
      clearTimeout(speakTimer);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isEnabled, currentStep, translatedMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
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
      {/* Mouse Pointer */}
      <motion.div
        animate={currentStep === 'link' ? {
          x: [0, 15, 0, -15, 0],
          y: [0, -8, 0, -8, 0]
        } : {
          y: [0, -10, 0]
        }}
        transition={{
          duration: currentStep === 'link' ? 1.5 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <MousePointer2 
          className="w-12 h-12" 
          style={{
            fill: '#e50914',
            filter: 'drop-shadow(0 4px 12px rgba(229, 9, 20, 0.6))'
          }}
        />

        {/* Ripple effect */}
        <motion.div
          animate={{
            scale: [1, 2.5, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-red-500"
        />
      </motion.div>

      {/* Speech Bubble */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute left-full ml-4 top-1/2 -translate-y-1/2 max-w-[85vw] sm:max-w-[320px]"
      >
        <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-pink-600 rounded-2xl p-3 sm:p-4 shadow-2xl">
          {/* Tail */}
          <div className="absolute right-full top-1/2 -translate-y-1/2">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[20px] border-r-red-600" />
          </div>

          {/* Content */}
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl flex-shrink-0">{steps[currentStep]?.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs sm:text-sm font-medium leading-relaxed break-words">
                {translatedMessage}
              </p>
            </div>
            {isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="flex-shrink-0"
              >
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </motion.div>
            )}
          </div>

          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Email content component
function EmailContent({ email, emailId, targetLanguage }) {
  const containerRef = useRef(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState(targetLanguage);
  const [textNodesData, setTextNodesData] = useState([]);

  // Reset and re-translate when language changes
  useEffect(() => {
    if (!containerRef.current || !email.rawHtml) return;

    // Reset to original HTML
    containerRef.current.innerHTML = email.rawHtml;
    setCurrentLanguage(targetLanguage);
    setTextNodesData([]);

    // Extract text nodes
    const nodes = extractTextNodes(containerRef.current);
    const originalTexts = nodes.map(n => n.originalText);
    setTextNodesData(nodes.map((n, i) => ({ node: n, originalText: originalTexts[i] })));

  }, [email.rawHtml, targetLanguage, emailId]);

  // Start translation
  useEffect(() => {
    if (textNodesData.length === 0 || currentLanguage !== targetLanguage) return;
    if (targetLanguage === 'en') {
      setIsTranslating(false);
      return;
    }

    let mounted = true;

    async function translateContent() {
      setIsTranslating(true);
      setTranslationProgress(0);

      const allTexts = textNodesData.map(d => d.originalText);
      const translatedTexts = await translateTextBatch(allTexts, targetLanguage);

      for (let i = 0; i < textNodesData.length; i++) {
        if (!mounted) break;

        setTranslationProgress(Math.round(((i + 1) / textNodesData.length) * 100));

        const nodeInfo = textNodesData[i].node;
        const translatedText = translatedTexts[i];

        nodeInfo.parent.classList.add('translating-line');
        nodeInfo.node.nodeValue = translatedText;

        await new Promise(r => setTimeout(r, 50));
        nodeInfo.parent.classList.remove('translating-line');
      }

      setIsTranslating(false);
      setTranslationProgress(100);
    }

    const timer = setTimeout(() => translateContent(), 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [textNodesData, targetLanguage, currentLanguage]);

  return (
    <div className="w-full relative">
      <style>{`
        @keyframes blink-translate {
          0%, 100% { 
            background-color: transparent;
            box-shadow: none;
          }
          50% { 
            background-color: rgba(239, 68, 68, 0.15);
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.4);
            border-radius: 4px;
          }
        }
        
        .translating-line {
          animation: blink-translate 0.6s ease-in-out infinite;
          padding: 2px 4px;
          margin: -2px -4px;
          display: inline-block;
          transition: all 0.2s ease;
        }
        
        .email-content-wrapper a {
          color: #e50914 !important;
          text-decoration: underline !important;
          font-weight: 600 !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          display: inline-block !important;
          margin: 4px 0 !important;
        }
        
        .email-content-wrapper a:hover {
          background-color: rgba(229, 9, 20, 0.1) !important;
        }
      `}</style>

      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800/95 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 z-10 shadow-lg border border-neutral-700">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-300 font-medium">
            {translationProgress}%
          </span>
        </div>
      )}

      <div 
        ref={containerRef}
        className="email-content-wrapper rounded-xl overflow-hidden bg-white p-4"
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%'
        }}
      />
    </div>
  );
}

// Main Home component
export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(null);
  const linkRef = useRef(null);

  const formSchema = useMemo(() => z.object({ email: z.string().email({ message: t.validEmailError }) }), [t]);
  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { email: "" } });

  const searchMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/findcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
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
          // Wait for email to render, then show link pointer
          setTimeout(() => {
            setCurrentGuideStep('link');
            // Scroll to email content
            setTimeout(() => {
              const emailContent = document.querySelector('.email-content-wrapper');
              if (emailContent) {
                emailContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          }, 1500);
        }
      } else {
        setResults(null);
        throw new Error(t.noNetflixEmails || "No Netflix emails found");
      }
    },
    onError: (error) => {
      setResults(null);
      toast({ 
        title: t.searchFailed || "Search Failed", 
        description: error.message,
        variant: "destructive" 
      });
      
      if (voiceGuideEnabled) {
        setCurrentGuideStep('noResult');
        
        // Translate and speak error message
        translateSingle(
          error.message || "No email found. Please try again with a different email address.",
          language
        ).then(translatedError => {
          const utterance = new SpeechSynthesisUtterance(translatedError);
          const langMap = {
            'bn': 'bn-IN',
            'hi': 'hi-IN',
            'es': 'es-ES',
            'en': 'en-US'
          };
          const targetLang = langMap[language] || 'en-US';
          utterance.lang = targetLang;
          
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.lang.startsWith(language));
          if (voice) utterance.voice = voice;
          
          window.speechSynthesis.speak(utterance);
        });
        
        setTimeout(() => {
          setCurrentGuideStep('input');
        }, 4000);
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

  // Voice guide flow
  useEffect(() => {
    if (!voiceGuideEnabled) {
      setCurrentGuideStep(null);
      window.speechSynthesis.cancel();
      return;
    }

    // Start with input field
    setCurrentGuideStep('input');
  }, [voiceGuideEnabled]);

  const handleGuideStepComplete = () => {
    if (currentGuideStep === 'input') {
      setTimeout(() => setCurrentGuideStep('button'), 800);
    } else if (currentGuideStep === 'button') {
      // Stay on button until form is submitted
    } else if (currentGuideStep === 'link') {
      setTimeout(() => setCurrentGuideStep(null), 2000);
    } else if (currentGuideStep === 'noResult') {
      setTimeout(() => setCurrentGuideStep('input'), 1500);
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 sm:p-4 bg-neutral-950 relative overflow-x-hidden">
      <AnimatePresence>
        {voiceGuideEnabled && currentGuideStep && (
          <VoiceGuideMouse
            isEnabled={voiceGuideEnabled}
            currentStep={currentGuideStep}
            language={language}
            onStepComplete={handleGuideStepComplete}
            linkRef={linkRef}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-4 notranslate"
              translate="no"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm sm:text-base font-bold">
                      {t.enterNetflixEmail}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                          id="email-input"
                          placeholder={t.emailPlaceholder}
                          className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Voice Guide Toggle */}
              <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div className="flex items-center gap-2">
                  {voiceGuideEnabled ? (
                    <Volume2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-500" />
                  )}
                  <span className="text-xs sm:text-sm text-neutral-300">Voice Guide</span>
                </div>
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    voiceGuideEnabled ? 'bg-green-600' : 'bg-neutral-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      voiceGuideEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <Button
                id="search-button"
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg"
                disabled={searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.searching}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {t.findCode}
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-4"
            >
              <div className="text-center">
                <p className="text-neutral-400 text-sm">{t.latestNetflixEmail}</p>
              </div>
              {results.emails.map((email, idx) => (
                <motion.div
                  key={email.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl"
                >
                  <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg sm:text-xl font-bold">N</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm sm:text-base">Netflix</p>
                        <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2">{email.subject}</p>
                      </div>
                    </div>
                    <span className="text-neutral-500 text-xs flex-shrink-0 ml-2">
                      {new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="p-2 sm:p-4" ref={idx === 0 ? linkRef : null}>
                    <EmailContent email={email} emailId={email.id || idx} targetLanguage={language} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {searchMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-neutral-900 rounded-xl p-4 border border-red-900/50 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
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
