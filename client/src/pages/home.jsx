
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
  if (!text || text.trim() === "") return text;
  
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    return data[0].map(item => item[0]).join("");
  } catch (err) {
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
function VoiceGuideMouse({ isEnabled, currentStep, language, onStepComplete, linkRefs }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef(null);
  const animationRef = useRef(null);
  const updateIntervalRef = useRef(null);

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

  // Translate message when language changes
  useEffect(() => {
    if (!isEnabled || !currentStep) return;

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

  // Speak message in selected language
  const speak = (text) => {
    if (!text || !isEnabled) return;

    window.speechSynthesis.cancel();

    return new Promise((resolve) => {
      // Wait for voices to load
      const speakWithVoices = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap = {
          'bn': 'bn-BD',
          'hi': 'hi-IN',
          'es': 'es-ES',
          'en': 'en-US'
        };
        
        const targetLang = langMap[language] || 'en-US';
        utterance.lang = targetLang;
        
        // Try to find a voice for the target language
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language)) || 
                     voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
        
        if (voice) {
          utterance.voice = voice;
        }
        
        utterance.rate = 0.85;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
          if (onStepComplete) {
            setTimeout(onStepComplete, 500);
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

      // Check if voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speakWithVoices();
      } else {
        // Wait for voices to load
        window.speechSynthesis.onvoiceschanged = () => {
          speakWithVoices();
        };
      }
    });
  };

  // Update position dynamically
  const updatePosition = (targetElement) => {
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const x = rect.left + rect.width / 2;
    const y = rect.top + scrollTop + rect.height / 2;

    setPosition({ x, y });
  };

  // Animate to target with ID/Class detection
  useEffect(() => {
    if (!isEnabled || !currentStep) return;

    let targetElement = null;

    // Detect element by ID/Class/Type
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
      // Find Netflix link
      const links = document.querySelectorAll('a[href*="netflix.com"]');
      targetElement = Array.from(links).find(link => 
        link.href.includes('/account/travel/verify') || 
        link.href.includes('/account/update-primary-location')
      );
      
      if (!targetElement && linkRefs?.current) {
        targetElement = linkRefs.current;
      }
    }

    if (!targetElement) {
      console.warn('Target element not found for step:', currentStep);
      return;
    }

    // Initial position
    updatePosition(targetElement);

    // Continuous position update (for responsive/scroll)
    updateIntervalRef.current = setInterval(() => {
      updatePosition(targetElement);
    }, 100);

    // Speak after animation
    const speakTimer = setTimeout(() => {
      if (translatedMessage) {
        speak(translatedMessage);
      }
    }, 800);

    // Bounce animation for links
    if (currentStep === 'link') {
      let bounceCount = 0;
      const bounceInterval = setInterval(() => {
        bounceCount++;
        if (bounceCount > 6) {
          clearInterval(bounceInterval);
        }
      }, 300);
      animationRef.current = bounceInterval;
    }

    return () => {
      clearTimeout(speakTimer);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isEnabled, currentStep, linkRefs]);

  // Re-speak when translation changes
  useEffect(() => {
    if (translatedMessage && isEnabled && currentStep && !isSpeaking) {
      const timer = setTimeout(() => {
        speak(translatedMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [translatedMessage]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  if (!isEnabled || !currentStep) return null;

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
          x: [0, 20, 0, -20, 0],
          y: [0, -10, 0, -10, 0]
        } : {
          y: [0, -10, 0]
        }}
        transition={{
          duration: currentStep === 'link' ? 1.8 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <MousePointer2 
          className="w-12 h-12" 
          style={{
            fill: 'url(#mouseGradient)',
            filter: 'drop-shadow(0 4px 12px rgba(229, 9, 20, 0.6))'
          }}
        />
        <svg width="0" height="0">
          <defs>
            <linearGradient id="mouseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#e50914', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>

        {/* Ripple effect */}
        <motion.div
          animate={{
            scale: [1, 2, 1],
            opacity: [0.6, 0, 0.6]
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
        className="absolute left-full ml-4 top-1/2 -translate-y-1/2 max-w-[90vw] sm:max-w-[300px]"
      >
        <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-pink-600 rounded-2xl p-3 sm:p-4 shadow-2xl">
          {/* Tail */}
          <div className="absolute right-full top-1/2 -translate-y-1/2">
            <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-12 border-r-red-600" 
                 style={{ borderRightWidth: '20px' }} />
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">{steps[currentStep]?.icon}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium leading-relaxed">
                {translatedMessage}
              </p>
            </div>
            {isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Volume2 className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </div>

          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
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
      <style jsx>{`
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
        className="email-content-wrapper rounded-xl overflow-hidden bg-white"
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
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
          setTimeout(() => {
            setCurrentGuideStep('link');
            // Scroll to links
            setTimeout(() => {
              linkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
          }, 1000);
        }
      } else {
        // No emails found
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
          const speak = new SpeechSynthesisUtterance(translatedError);
          const langMap = {
            'bn': 'bn-BD',
            'hi': 'hi-IN',
            'es': 'es-ES',
            'en': 'en-US'
          };
          speak.lang = langMap[language] || 'en-US';
          
          const voices = window.speechSynthesis.getVoices();
          const voice = voices.find(v => v.lang.startsWith(language));
          if (voice) speak.voice = voice;
          
          window.speechSynthesis.speak(speak);
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
      return;
    }

    // Start with input field
    setCurrentGuideStep('input');
  }, [voiceGuideEnabled]);

  const handleGuideStepComplete = () => {
    if (currentGuideStep === 'input') {
      // Move to button after input step
      setTimeout(() => setCurrentGuideStep('button'), 500);
    } else if (currentGuideStep === 'button') {
      // Don't clear - wait for form submission
      // setCurrentGuideStep(null);
    } else if (currentGuideStep === 'link') {
      setCurrentGuideStep(null);
    } else if (currentGuideStep === 'noResult') {
      setTimeout(() => setCurrentGuideStep('input'), 1000);
    }
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    const newState = !voiceGuideEnabled;
    setVoiceGuideEnabled(newState);
    
    if (!newState) {
      // Turning off - clean up
      window.speechSynthesis.cancel();
      setCurrentGuideStep(null);
    }
    // If turning on, useEffect will handle starting at 'input'
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 sm:p-4 bg-neutral-950 relative">
      <VoiceGuideMouse
        isEnabled={voiceGuideEnabled}
        currentStep={currentGuideStep}
        language={language}
        onStepComplete={handleGuideStepComplete}
        linkRefs={linkRef}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl space-y-4 sm:space-y-6 py-4 sm:py-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">{t.title}</h1>
          <p className="text-neutral-500 text-sm">{t.subtitle}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800"
        >
          <div className="text-center mb-5">
            <h2 className="text-lg font-medium text-white">{t.findLatestEmail}</h2>
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
                    <FormLabel className="text-white text-base font-bold">
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
                  <span className="text-sm text-neutral-300">Voice Guide</span>
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
                      <div>
                        <p className="font-semibold text-white text-sm sm:text-base">Netflix</p>
                        <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2">{email.subject}</p>
                      </div>
                    </div>
                    <span className="text-neutral-500 text-xs">
                      {new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="p-2 sm:p-4" ref={linkRef}>
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
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-red-400 font-medium text-sm">{t.searchFailed}</h3>
                <p className="text-neutral-500 text-xs mt-0.5">{searchMutation.error?.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-center text-xs text-neutral-600">{t.showsLatestOnly}</p>
      </motion.div>
    </div>
  );
}
