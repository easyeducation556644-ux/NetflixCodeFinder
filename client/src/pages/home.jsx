import { useState, useMemo, useEffect } from "react";
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

// ------------------ Translation ------------------

// Simple in-memory cache for repeated text
const translationCache = {};

async function translateTextCached(text, targetLang) {
  if (!text || targetLang === "en") return text;

  const key = `${targetLang}-${text}`;
  if (translationCache[key]) return translationCache[key];

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    const translated = data[0].map(item => item[0]).join("");
    translationCache[key] = translated;
    return translated;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

// EmailContent component
function EmailContent({ email, emailId, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function translateHtmlStreaming(html) {
      if (targetLanguage === "en") {
        setTranslatedHtml(html);
        return;
      }

      setIsTranslating(true);
      const div = document.createElement("div");
      div.innerHTML = html;

      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim().length > 0) textNodes.push(node);
      }

      const batchSize = 5; // small batch → faster feel
      for (let i = 0; i < textNodes.length; i += batchSize) {
        if (!isMounted) break;

        const batch = textNodes.slice(i, i + batchSize);
        const translations = await Promise.all(batch.map(n => translateTextCached(n.textContent, targetLanguage)));

        batch.forEach((n, idx) => (n.textContent = translations[idx]));
        setTranslatedHtml(div.innerHTML); // progressive render
      }

      if (isMounted) setIsTranslating(false);
    }

    translateHtmlStreaming(email.rawHtml);

    return () => { isMounted = false; };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div className="w-full relative" data-testid={`email-content-${emailId}`}>
      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-400">Translating...</span>
        </div>
      )}
      <div
        className="email-content-wrapper rounded-xl overflow-hidden bg-white"
        dangerouslySetInnerHTML={{ __html: translatedHtml }}
      />
    </div>
  );
}

// ------------------ Main Home Component ------------------
export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);

  const formSchema = useMemo(() => z.object({
    email: z.string().email({ message: t.validEmailError }),
  }), [t]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

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

  function onSubmit(data, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
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
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">{t.title}</h1>
          <p className="text-neutral-500 text-sm">{t.subtitle}</p>
        </div>

        {/* Email Search Form */}
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
            <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(e); }} className="space-y-4 notranslate" translate="no">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-base font-bold">{t.enterNetflixEmail}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input {...field} placeholder={t.emailPlaceholder} className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"/>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t.searching}</span>
                ) : (
                  <span className="flex items-center gap-2"><Search className="h-4 w-4" />{t.findCode}</span>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        {/* Emails */}
        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div className="w-full space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="text-center"><p className="text-neutral-400 text-sm">{t.latestNetflixEmail}</p></div>

              {results.emails.map((email, idx) => (
                <motion.div key={email.id || idx} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                  {/* Card Header */}
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
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                          </div>
                          <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2">{email.subject}</p>
                        </div>
                      </div>
                      <span className="text-neutral-500 text-xs flex-shrink-0">{new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-2 sm:p-4">
                    <EmailContent email={email} emailId={email.id || idx} targetLanguage={language} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {searchMutation.isError && (
            <motion.div className="bg-neutral-900 rounded-xl p-4 border border-red-900/50 flex items-start gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400"/>
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
