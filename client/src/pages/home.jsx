import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

// Translation cache - global persist
const translationCache = new Map();

// Google Translate helper with batch support
async function translateTextBatch(texts, targetLang) {
  if (!texts || texts.length === 0) return [];
  
  // Check cache first
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
  
  // If all cached, return immediately
  if (toTranslate.length === 0) {
    return results;
  }
  
  // Translate in batch (max 10 at a time for speed)
  const batchSize = 10;
  for (let i = 0; i < toTranslate.length; i += batchSize) {
    const batch = toTranslate.slice(i, i + batchSize);
    const batchIndices = indices.slice(i, i + batchSize);
    
    // Parallel translation
    const promises = batch.map(text => translateSingle(text, targetLang));
    const translated = await Promise.all(promises);
    
    // Store results
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
    const translated = data[0].map(item => item[0]).join("");
    return translated;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

// Extract text nodes with their parent elements
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

// Email content component with line-by-line translation - FIXED VERSION
function EmailContent({ email, emailId, targetLanguage }) {
  const containerRef = useRef(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState(targetLanguage);
  const originalHtmlRef = useRef(email.rawHtml);

  // Update original HTML ref when email changes
  useEffect(() => {
    originalHtmlRef.current = email.rawHtml;
  }, [email.rawHtml]);

  // Reset when language changes
  useEffect(() => {
    if (currentLanguage !== targetLanguage) {
      console.log(`Language changed: ${currentLanguage} -> ${targetLanguage}`);
      setCurrentLanguage(targetLanguage);
      setIsTranslating(false);
      setTranslationProgress(0);
      
      // Reset to original HTML
      if (containerRef.current && originalHtmlRef.current) {
        containerRef.current.innerHTML = originalHtmlRef.current;
      }
    }
  }, [targetLanguage, currentLanguage]);

  // Initialize: Parse HTML and show original
  useEffect(() => {
    if (!containerRef.current || !originalHtmlRef.current) return;
    containerRef.current.innerHTML = originalHtmlRef.current;
  }, [emailId]);

  // Start translation after showing original
  useEffect(() => {
    if (!containerRef.current || !originalHtmlRef.current) return;

    let mounted = true;

    async function translateLineByLine() {
      setIsTranslating(true);
      setTranslationProgress(0);
      
      // Small delay to show original first
      await new Promise(r => setTimeout(r, 300));
      
      if (!mounted) return;
      
      // Extract text nodes from the actual DOM
      const liveNodes = extractTextNodes(containerRef.current);
      
      if (liveNodes.length === 0) {
        setIsTranslating(false);
        return;
      }

      console.log(`Translating ${liveNodes.length} text nodes to ${targetLanguage}`);

      // Collect all texts for batch translation
      const allTexts = liveNodes.map(n => n.originalText);
      
      // Translate in batch
      const translatedTexts = await translateTextBatch(allTexts, targetLanguage);
      
      if (!mounted) return;
      
      // Apply translations one by one with animation
      for (let i = 0; i < liveNodes.length; i++) {
        if (!mounted) break;
        
        setTranslationProgress(Math.round(((i + 1) / liveNodes.length) * 100));
        
        const nodeInfo = liveNodes[i];
        const translatedText = translatedTexts[i];
        
        // Add blinking effect to parent element
        nodeInfo.parent.classList.add('translating-line');
        
        // Update the text node
        nodeInfo.node.nodeValue = translatedText;
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 50));
        
        if (!mounted) break;
        
        // Remove blinking effect
        nodeInfo.parent.classList.remove('translating-line');
      }
      
      if (mounted) {
        setIsTranslating(false);
        setTranslationProgress(100);
        console.log(`Translation completed for ${targetLanguage}`);
      }
    }

    translateLineByLine();

    return () => {
      mounted = false;
    };
  }, [targetLanguage, emailId]); // Re-run when language or email changes

  return (
    <div className="w-full relative" data-testid={`email-content-${emailId}`}>
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
      setResults(data); 
      toast({ title: t.emailFound, description: t.foundLatestEmail }); 
    },
    onError: () => setResults(null),
  });

  function onSubmit(data, e) { 
    if (e) { 
      e.preventDefault(); 
      e.stopPropagation(); 
    } 
    setResults(null); 
    searchMutation.mutate(data); 
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-2 sm:p-4 bg-neutral-950">
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
              <Button 
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

        {/* Re-view Guide Button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              localStorage.removeItem("has-seen-guide");
              window.location.reload();
            }}
            className="bg-neutral-800 hover:bg-neutral-700 text-white transition-colors gap-2 px-6"
          >
            <span className="font-medium">{t.guide.backToGuide}</span>
          </Button>
        </div>

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
                  <div className="p-2 sm:p-4">
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
