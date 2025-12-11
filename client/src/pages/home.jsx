import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, Loader2, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

// =================== Translation Helpers ===================

function getTranslationCacheKey(text, lang) {
  return `translate_cache_${lang}_${btoa(text)}`;
}

async function translateText(text, targetLang) {
  if (!text || targetLang === "en") return text;

  const cacheKey = getTranslationCacheKey(text, targetLang);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await response.json();
    const translated = data[0].map(item => item[0]).join("");
    localStorage.setItem(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

// Streaming translation line by line with highlight
async function translateHTMLStreamingHighlight(html, targetLang, onUpdateLine) {
  if (!html || targetLang === "en") return html;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length > 0) textNodes.push(node);
  }

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const translated = await translateText(node.textContent, targetLang);
    node.textContent = translated;

    // Wrap current line in <mark> for highlighting
    const htmlWithHighlight = tempDiv.cloneNode(true);
    textNodes.forEach((n, idx) => {
      if (idx === i) {
        const mark = document.createElement("mark");
        mark.textContent = n.textContent;
        n.parentNode.replaceChild(mark, n);
      }
    });

    onUpdateLine(i, htmlWithHighlight.innerHTML);
  }

  return tempDiv.innerHTML;
}

// =================== EmailContent Component ===================
function EmailContent({ email, emailId, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);

  useEffect(() => {
    let isMounted = true;

    async function doTranslate() {
      if (targetLanguage === "en") {
        setTranslatedHtml(email.rawHtml);
        return;
      }

      try {
        await translateHTMLStreamingHighlight(email.rawHtml, targetLanguage, (lineIndex, html) => {
          if (isMounted) setTranslatedHtml(html);
        });
      } catch (err) {
        console.error(err);
      }
    }

    doTranslate();

    return () => {
      isMounted = false;
    };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div className="w-full relative" data-testid={`email-content-${emailId}`}>
      <div
        className="email-content-wrapper rounded-xl overflow-hidden bg-white p-2"
        dangerouslySetInnerHTML={{ __html: translatedHtml || "" }}
      />
    </div>
  );
}

// =================== Home Component ===================
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
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      return json;
    },
    onSuccess: (data) => {
      setResults(data);
      toast({ title: t.emailFound, description: t.foundLatestEmail });
    },
    onError: () => {
      setResults(null);
    },
  });

  function onSubmit(data, event) {
    if (event) event.preventDefault();
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

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-4">
              <div className="text-center">
                <p className="text-neutral-400 text-sm">{t.latestNetflixEmail}</p>
              </div>

              {results.emails.map((email, index) => (
                <motion.div key={email.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl" data-testid={`card-email-${index}`}>
                  <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/80">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-lg sm:text-xl font-bold">N</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-white text-sm sm:text-base">Netflix</span>
                          </div>
                          <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2">{email.subject}</p>
                        </div>
                      </div>
                      <span className="text-neutral-500 text-xs flex-shrink-0">{new Date(email.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-4">
                    <EmailContent email={email} emailId={email.id || index} targetLanguage={language} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
                                                                                                 }
