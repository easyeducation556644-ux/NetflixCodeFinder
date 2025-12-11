import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2, ExternalLink, Languages } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

// Translation helper using Google Translate API (free tier)
async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0].map(item => item[0]).join('');
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// Extract text content from HTML
function extractTextFromHTML(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script and style tags
  const scripts = tempDiv.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());
  
  return tempDiv.textContent || tempDiv.innerText || '';
}

// Translate HTML content while preserving structure
async function translateHTML(html, targetLang) {
  if (!html || targetLang === 'en') return html;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find all text nodes and translate them
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text && text.length > 0) {
      textNodes.push(node);
    }
  }
  
  // Translate all text nodes in batches
  const batchSize = 10;
  for (let i = 0; i < textNodes.length; i += batchSize) {
    const batch = textNodes.slice(i, i + batchSize);
    const translations = await Promise.all(
      batch.map(node => translateText(node.textContent, targetLang))
    );
    
    batch.forEach((node, index) => {
      node.textContent = translations[index];
    });
  }
  
  return tempDiv.innerHTML;
}

function EmailContent({ email, emailId, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function translateContent() {
      if (targetLanguage === 'en') {
        setTranslatedHtml(email.rawHtml);
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateHTML(email.rawHtml, targetLanguage);
        if (isMounted) {
          setTranslatedHtml(translated);
        }
      } catch (error) {
        console.error('Translation failed:', error);
        if (isMounted) {
          setTranslatedHtml(email.rawHtml);
        }
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    }

    translateContent();

    return () => {
      isMounted = false;
    };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div 
      className="w-full relative"
      data-testid={`email-content-${emailId}`}
    >
      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-400">Translating...</span>
        </div>
      )}
      <div 
        className="email-content-wrapper rounded-xl overflow-hidden bg-white"
        dangerouslySetInnerHTML={{ __html: translatedHtml || "" }}
      />
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);

  const formSchema = useMemo(() => z.object({
    email: z.string().email({ message: t.validEmailError }),
  }), [t]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/api/findcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Something went wrong");
      }
      
      return json;
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: t.emailFound,
        description: t.foundLatestEmail,
      });
    },
    onError: (error) => {
      setResults(null);
    },
  });

  function onSubmit(data, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
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
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">
            {t.title}
          </h1>
          <p className="text-neutral-500 text-sm">
            {t.subtitle}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800"
        >
          <div className="text-center mb-5">
            <h2 className="text-lg font-medium text-white">{t.findLatestEmail}</h2>
            <p className="text-neutral-500 text-xs mt-1">
              {t.enterEmailDescription}
            </p>
          </div>

          <Form {...form}>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.action) {
                  e.target.action = '';
                  e.target.target = '';
                }
                form.handleSubmit(onSubmit)(e);
              }} 
              className="space-y-4 notranslate"
              translate="no"
              action="javascript:void(0);"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-base font-bold">{t.enterNetflixEmail}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input 
                          placeholder={t.emailPlaceholder} 
                          className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" 
                          {...field} 
                          data-testid="input-email"
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
                data-testid="button-find-code"
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
          {results && results.emails && results.emails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-4"
            >
              <div className="text-center">
                <p className="text-neutral-400 text-sm">
                  {t.latestNetflixEmail}
                </p>
              </div>

              {results.emails.map((email, index) => (
                <motion.div
                  key={email.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl"
                  data-testid={`card-email-${index}`}
                >
                  <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/80">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-lg sm:text-xl font-bold">N</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-white text-sm sm:text-base">Netflix</span>
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2" data-testid={`text-subject-${index}`}>
                            {email.subject}
                          </p>
                        </div>
                      </div>
                      <span className="text-neutral-500 text-xs flex-shrink-0">
                        {new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-4">
                    <EmailContent 
                      email={email}
                      emailId={email.id || index}
                      targetLanguage={language}
                    />
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
              <div>
                <h3 className="text-red-400 font-medium text-sm">{t.searchFailed}</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {searchMutation.error.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-neutral-600">
          {t.showsLatestOnly}
        </p>
      </motion.div>
    </div>
  );
                  }
