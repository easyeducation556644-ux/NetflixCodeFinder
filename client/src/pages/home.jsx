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

// Translation using LibreTranslate
async function translateTextLibre(text, targetLang) {
  if (!text) return text;
  
  try {
    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text",
      }),
    });
    const data = await response.json();
    return data.translatedText || text;
  } catch (err) {
    console.error("Translate error:", err);
    return text;
  }
}

function EmailContent({ email, targetLanguage }) {
  const [translatedHtml, setTranslatedHtml] = useState(email.rawHtml);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  useEffect(() => {
    let isMounted = true;
    async function translateLines() {
      if (!email.rawHtml) return;
      
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = email.rawHtml;
      const nodes = Array.from(tempDiv.querySelectorAll("*")).filter(n => n.childNodes.length === 1 && n.childNodes[0].nodeType === Node.TEXT_NODE);
      
      for (let i = 0; i < nodes.length; i++) {
        if (!isMounted) break;
        setCurrentLineIndex(i);
        const originalText = nodes[i].textContent.trim();
        if (!originalText) continue;
        const translated = await translateTextLibre(originalText, targetLanguage);
        nodes[i].textContent = translated;
        setTranslatedHtml(tempDiv.innerHTML);
      }
      setCurrentLineIndex(-1);
    }

    translateLines();

    return () => { isMounted = false; };
  }, [email.rawHtml, targetLanguage]);

  return (
    <div className="w-full relative">
      {translatedHtml && (
        <div className="email-content-wrapper rounded-xl overflow-hidden bg-white" dangerouslySetInnerHTML={{ __html: translatedHtml }} />
      )}
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [results, setResults] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(language || "en");

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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl space-y-4 sm:space-y-6 py-4 sm:py-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">{t.title}</h1>
          <p className="text-neutral-500 text-sm">{t.subtitle}</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
          <div className="text-center mb-5">
            <h2 className="text-lg font-medium text-white">{t.findLatestEmail}</h2>
            <p className="text-neutral-500 text-xs mt-1">{t.enterEmailDescription}</p>
          </div>

          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="space-y-4 notranslate" translate="no">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-base font-bold">{t.enterNetflixEmail}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <Input placeholder={t.emailPlaceholder} className="pl-10 h-10 bg-neutral-800 border-neutral-700 rounded-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )} />

              <select value={currentLanguage} onChange={(e) => setCurrentLanguage(e.target.value)} className="w-full bg-neutral-800 text-white rounded-lg p-2 border border-neutral-700">
                <option value="en">English</option>
                <option value="bn">Bengali</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t.searching}</span>) :
                  (<span className="flex items-center gap-2"><Search className="h-4 w-4" />{t.findCode}</span>)}
              </Button>
            </form>
          </Form>
        </motion.div>

        <AnimatePresence mode="wait">
          {results && results.emails && results.emails.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-4">
              {results.emails.map((email, index) => (
                <motion.div key={email.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
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
                      <span className="text-neutral-500 text-xs flex-shrink-0">
                        {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-4">
                    <EmailContent email={email} targetLanguage={currentLanguage} />
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
