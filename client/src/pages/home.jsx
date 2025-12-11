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

// ======================================================================================
// FASTEST TRANSLATION SYSTEM (OPTION 1 — RAM CACHE)
// ======================================================================================

// RAM Cache (clears after tab reload)
const translateCache = new Map();

// Google Translate API (free)
async function translateText(text, targetLang) {
  const key = `${targetLang}:${text}`;
  if (translateCache.has(key)) return translateCache.get(key);

  if (!text || text.trim() === "") return text;

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`
    );
    const data = await res.json();

    const translated = data?.[0]?.map(item => item?.[0]).join("") || text;

    translateCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

// Translate HTML but keep structure
async function translateHTML(html, targetLang) {
  if (targetLang === "en") {
    // Even "en" translates (auto → en)
  }

  const key = `html:${targetLang}:${html}`;
  if (translateCache.has(key)) return translateCache.get(key);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
  const nodes = [];

  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) nodes.push(node);
  }

  for (const n of nodes) {
    n.textContent = await translateText(n.textContent, targetLang);
  }

  const translatedHTML = wrapper.innerHTML;

  translateCache.set(key, translatedHTML);
  return translatedHTML;
}

// ======================================================================================
// EMAIL CONTENT COMPONENT
// ======================================================================================

function EmailContent({ email, emailId, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      // 1) Show raw instantly
      setTranslatedHtml(email.rawHtml);

      // 2) Begin translating in background
      setIsTranslating(true);

      const output = await translateHTML(email.rawHtml, targetLanguage);

      if (alive) {
        setTranslatedHtml(output);
        setIsTranslating(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div className="w-full relative" data-testid={`email-content-${emailId}`}>
      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-400">Translating…</span>
        </div>
      )}

      <div
        className="email-content-wrapper rounded-xl overflow-hidden bg-white"
        dangerouslySetInnerHTML={{ __html: translatedHtml }}
      />
    </div>
  );
}

// ======================================================================================
// MAIN HOME COMPONENT
// ======================================================================================

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
    onError: () => {
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
        className="w-full max-w-4xl space-y-6 py-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">
            {t.title}
          </h1>
          <p className="text-neutral-500 text-sm">
            {t.subtitle}
          </p>
        </div>

        {/* SEARCH BOX */}
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
              onSubmit={form.handleSubmit(onSubmit)}
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
                          className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-primary"
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

        {/* EMAIL RESULTS */}
        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-4"
            >
              {results.emails.map((email, index) => (
                <motion.div
                  key={email.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl"
                >
                  <div className="p-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl font-bold">N</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">Netflix</p>
                        <p className="text-neutral-400 text-xs">{email.subject}</p>
                      </div>
                      <span className="text-neutral-500 text-xs">
                        {new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
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

          {/* ERROR BOX */}
          {searchMutation.isError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-neutral-900 rounded-xl p-4 border border-red-900/50 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-red-400 font-medium text-sm">{t.searchFailed}</h3>
                <p className="text-neutral-500 text-xs mt-1">
                  {searchMutation.error.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
              }
