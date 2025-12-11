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

/* ---------------------------------------------------------------------
    SIMPLE TRANSLATION CACHE SYSTEM
------------------------------------------------------------------------ */
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCache(cacheKey) {
  try {
    const stored = localStorage.getItem(cacheKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data }));
  } catch {}
}

/* ---------------------------------------------------------------------
   TRANSLATION HELPERS
------------------------------------------------------------------------ */

async function translateText(text, targetLang) {
  if (!text || targetLang === "en") return text;

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await response.json();

    if (Array.isArray(data?.[0])) {
      return data[0].map((item) => item[0]).join("");
    }
    return text;
  } catch {
    return text;
  }
}

async function translateHTML(html, targetLang, emailId) {
  if (!html || targetLang === "en") return html;

  const cacheKey = `email_html_cache_${emailId}_${targetLang}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }

  const batchSize = 10;
  for (let i = 0; i < textNodes.length; i += batchSize) {
    const batch = textNodes.slice(i, i + batchSize);
    const translated = await Promise.all(
      batch.map((node) => translateText(node.textContent, targetLang))
    );

    batch.forEach((node, index) => {
      node.textContent = translated[index];
    });
  }

  const finalHtml = tempDiv.innerHTML;
  setCache(cacheKey, finalHtml);

  return finalHtml;
}

/* ---------------------------------------------------------------------
   EMAIL CONTENT COMPONENT
------------------------------------------------------------------------ */
function EmailContent({ email, emailId, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let active = true;

    async function run() {
      if (targetLanguage === "en") {
        setTranslatedHtml(email.rawHtml);
        return;
      }

      setIsTranslating(true);
      const html = await translateHTML(email.rawHtml, targetLanguage, emailId);

      if (active) {
        setTranslatedHtml(html);
        setIsTranslating(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [email.rawHtml, targetLanguage, emailId]);

  return (
    <div className="relative w-full">
      {isTranslating && (
        <div className="absolute top-1 right-1 bg-neutral-900 px-3 py-1.5 rounded-lg flex items-center gap-2 z-20">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          <span className="text-xs text-neutral-400">Translating...</span>
        </div>
      )}

      <div
        className="email-content-wrapper bg-white rounded-xl overflow-hidden"
        dangerouslySetInnerHTML={{ __html: translatedHtml }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------
   MAIN PAGE
------------------------------------------------------------------------ */
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
    mutationFn: async ({ email }) => {
      const res = await fetch("/api/findcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      return json;
    },

    onSuccess: (data) => {
      setResults(data);
      toast({
        title: t.emailFound,
        description: t.foundLatestEmail,
      });
    },

    onError: () => setResults(null),
  });

  function onSubmit(data, e) {
    e.preventDefault();
    setResults(null);
    searchMutation.mutate(data);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 bg-neutral-950">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-6 py-6"
      >
        <h1 className="text-4xl font-bold text-primary text-center">{t.title}</h1>

        {/* Form Box */}
        <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">{t.enterNetflixEmail}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <Input
                          {...field}
                          placeholder={t.emailPlaceholder}
                          className="pl-10 bg-neutral-800 text-white border-neutral-700"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={searchMutation.isPending} className="w-full bg-primary">
                {searchMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
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
        </div>

        {/* Email Results */}
        <AnimatePresence>
          {results?.emails?.length > 0 && (
            <div className="space-y-4">
              {results.emails.map((email, index) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden"
                >
                  <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                    <div className="text-white font-semibold">Netflix</div>
                    <div className="text-neutral-500 text-xs">
                      {new Date(email.receivedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="p-4">
                    <EmailContent
                      email={email}
                      emailId={email.id}
                      targetLanguage={language}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
