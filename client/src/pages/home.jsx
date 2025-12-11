import { useState, useEffect, useMemo } from "react";
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

// ------------- TRANSLATION UTILS -------------

// Simple cache to avoid repeating API calls
const translationCache = new Map();

// LibreTranslate API call
async function libreTranslate(text, targetLang) {
  if (!text) return text;
  const key = `${text}-${targetLang}`;
  if (translationCache.has(key)) return translationCache.get(key);

  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text",
      }),
    });
    const json = await response.json();
    const translated = json.translatedText || text;
    translationCache.set(key, translated);
    return translated;
  } catch (err) {
    console.error("LibreTranslate error", err);
    return text;
  }
}

// ------------- EMAIL CONTENT COMPONENT -------------

function EmailContent({ email, emailId, targetLanguage }) {
  const [htmlContent, setHtmlContent] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let mounted = true;
    setHtmlContent(email.rawHtml);

    // Don't translate if English
    if (!targetLanguage || targetLanguage === "en") {
      return;
    }

    async function streamTranslateHTML() {
      setIsTranslating(true);

      // Parse HTML into DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(email.rawHtml, "text/html");

      // Collect text nodes
      const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim()) {
          textNodes.push(node);
        }
      }

      // Translate each text node word by word
      for (let nIdx = 0; nIdx < textNodes.length; nIdx++) {
        if (!mounted) break;
        const origText = textNodes[nIdx].textContent;
        const words = origText.split(/\s+/);
        const translatedWords = [];

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          if (!mounted) break;

          // Translate single word
          const tWord = await libreTranslate(words[wIdx], targetLanguage);

          translatedWords.push(tWord);

          // Build streaming text with highlight
          const filled = translatedWords
            .map((w, i) => (i === wIdx ? `<mark>${w}</mark>` : w))
            .join(" ");

          textNodes[nIdx].nodeValue = filled;
          setHtmlContent(doc.body.innerHTML);

          // Small delay for visible streaming effect
          await new Promise((r) => setTimeout(r, 30));
        }

        // Remove highlight after finishing this node
        textNodes[nIdx].nodeValue = translatedWords.join(" ");
        setHtmlContent(doc.body.innerHTML);
      }

      setIsTranslating(false);
    }

    streamTranslateHTML();

    return () => {
      mounted = false;
    };
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
        className="email-content-wrapper rounded-xl overflow-auto bg-white p-2 sm:p-4"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

// ------------- MAIN HOME COMPONENT -------------

export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: t.validEmailError }),
      }),
    [t]
  );

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
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="space-y-4 notranslate" translate="no">
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
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg" disabled={searchMutation.isPending}>
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

        {/* Email Results */}
        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-4">
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
                    <span className="text-neutral-500 text-xs">{new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div className="p-2 sm:p-4">
                    <EmailContent email={email} emailId={email.id || idx} targetLanguage={language} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {searchMutation.isError && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-neutral-900 rounded-xl p-4 border border-red-900/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-red-400" /></div>
              <div><h3 className="text-red-400 font-medium text-sm">{t.searchFailed}</h3><p className="text-neutral-500 text-xs mt-0.5">{searchMutation.error?.message}</p></div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-neutral-600">{t.showsLatestOnly}</p>
      </motion.div>
    </div>
  );
}
