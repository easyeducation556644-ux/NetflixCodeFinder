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

// ----------------------------
// Free Google Translate API + Cache
// ----------------------------
const translationCache = {};

async function translateTextCached(text, targetLang) {
  if (!text) return text;
  if (targetLang === 'en') return text; // English = original
  const key = `${targetLang}-${text}`;
  if (translationCache[key]) return translationCache[key];

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await response.json();
    const translated = data[0].map(item => item[0]).join('');
    translationCache[key] = translated;
    return translated;
  } catch (e) {
    console.error("Translation failed:", e);
    return text;
  }
}

// ----------------------------
// Translate HTML preserving structure
// ----------------------------
async function translateHTMLFast(html, targetLang) {
  if (!html) return html;
  if (targetLang === 'en') return html;

  const div = document.createElement('div');
  div.innerHTML = html;

  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) textNodes.push(node);
  }

  const batchSize = 20;
  const translateBatch = async (batch) => {
    const translations = await Promise.all(batch.map(node => translateTextCached(node.textContent, targetLang)));
    batch.forEach((node, idx) => node.textContent = translations[idx]);
  };

  const batches = [];
  for (let i = 0; i < textNodes.length; i += batchSize) {
    batches.push(textNodes.slice(i, i + batchSize));
  }

  await Promise.all(batches.map(batch => translateBatch(batch)));

  return div.innerHTML;
}

// ----------------------------
// EmailContent Component
// ----------------------------
function EmailContent({ email, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function translate() {
      if (targetLanguage === 'en') {
        setTranslatedHtml(email.rawHtml);
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateHTMLFast(email.rawHtml, targetLanguage);
        if (isMounted) setTranslatedHtml(translated);
      } catch (e) {
        console.error("Translation error:", e);
        if (isMounted) setTranslatedHtml(email.rawHtml);
      } finally {
        if (isMounted) setIsTranslating(false);
      }
    }

    translate();
    return () => { isMounted = false; };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div className="w-full relative">
      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-400">Translating...</span>
        </div>
      )}
      <div className="email-content-wrapper" dangerouslySetInnerHTML={{ __html: translatedHtml }} />
    </div>
  );
}

// ----------------------------
// Home Component
// ----------------------------
export default function Home() {
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
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
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">{t.title}</h1>
          <p className="text-neutral-500 text-sm">{t.subtitle}</p>
          {/* Language Switch */}
          <div className="flex justify-center gap-2 mt-2">
            {['en','bn','es','hi','fr','de','pt','it','ko','ar'].map(code => (
              <button
                key={code}
                className={`px-3 py-1 rounded ${language === code ? 'bg-primary text-white' : 'bg-neutral-800 text-neutral-300'}`}
                onClick={() => setLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search Form */}
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
              onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(onSubmit)(e); }}
              className="space-y-4 notranslate"
              translate="no"
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

        {/* Email Results */}
        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div className="w-full space-y-4">
              {results.emails.map((email, index) => (
                <motion.div
                  key={email.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden"
                >
                  <EmailContent email={email} targetLanguage={language} />
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
                  {searchMutation.error?.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
