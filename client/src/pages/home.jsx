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

// Translation cache
const translationCache = new Map();

// Google Translate helper
async function translateText(text, targetLang) {
  if (!text) return "";
  const lang = targetLang || "en";
  const cacheKey = `${text}-${lang}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    const translated = data[0].map(item => item[0]).join("");
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

// Parse HTML and return text nodes (Updated to safely handle HTML and exclude headers/scripts/styles)
function parseHTMLToLines(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lines = [];

  function isVisibleText(node) {
    if (node.parentNode) {
      const parentName = node.parentNode.nodeName.toLowerCase();
      // Exclude text within style, script, head, or title tags
      if (parentName === 'style' || parentName === 'script' || parentName === 'head' || parentName === 'title') {
        return false;
      }
    }
    return true;
  }

  // Use a recursive function to traverse the body and collect visible text
  function collectText(element) {
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];

      if (node.nodeType === Node.TEXT_NODE) {
        // Ensure the text is not just whitespace and is inside a visible element
        const text = node.nodeValue.trim();
        if (text && isVisibleText(node)) {
          // Splitting by newline might capture blocks correctly
          text.split('\n').forEach(line => {
             const trimmedLine = line.trim();
             if (trimmedLine) lines.push(trimmedLine);
          });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Only traverse elements that are not style/script/head
        const tagName = node.tagName.toLowerCase();
        if (tagName !== 'style' && tagName !== 'script' && tagName !== 'head') {
          collectText(node);
        }
      }
    }
  }

  // Start collection from the document body
  if (doc.body) {
    collectText(doc.body);
  }

  return lines;
}

// Email content component
function EmailContent({ email, emailId, targetLanguage }) {
  // Rerunning parseHTMLToLines only if email.rawHtml changes
  const [rawLines, setRawLines] = useState(() => parseHTMLToLines(email.rawHtml));
  const [translatedLines, setTranslatedLines] = useState(() => [...rawLines]);
  const [currentLine, setCurrentLine] = useState(-1);
  const [currentWord, setCurrentWord] = useState(-1);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRawShown, setIsRawShown] = useState(true); // Feature: Raw email shown first

  // Reset lines when emailId changes (if navigating between emails)
  useEffect(() => {
    const newRawLines = parseHTMLToLines(email.rawHtml);
    setRawLines(newRawLines);
    setTranslatedLines(newRawLines); // Initially show raw lines
    setIsRawShown(true); // Start by showing raw
  }, [email.rawHtml, emailId]);


  useEffect(() => {
    // Only run translation if the target language changes AND we are not showing the raw email initially
    if (!isRawShown || targetLanguage) { 
      let mounted = true;

      async function translateWordByWord() {
        setIsTranslating(true);
        setIsRawShown(false); // Start translation, hide raw view
        
        // Start translation from rawLines
        const newTranslated = [...rawLines];

        for (let i = 0; i < rawLines.length; i++) {
          if (!mounted) break;
          setCurrentLine(i);
          const words = rawLines[i].split(/\s+/);
          const translatedWords = [];

          for (let j = 0; j < words.length; j++) {
            if (!mounted) break;
            setCurrentWord(j);
            // Translate the raw word
            const tWord = await translateText(words[j], targetLanguage);
            translatedWords[j] = tWord;
            
            // Update the state to stream word by word
            newTranslated[i] = translatedWords.join(" ");
            setTranslatedLines([...newTranslated]);
            await new Promise(r => setTimeout(r, 50)); // Word streaming delay
          }
          setCurrentWord(-1);
        }
        setCurrentLine(-1);
        setIsTranslating(false);
      }
      
      // Delay translation slightly to ensure raw email is displayed first
      const timer = setTimeout(() => {
        translateWordByWord();
      }, 500); 

      return () => { 
        mounted = false; 
        clearTimeout(timer);
      };
    }
    
    // Cleanup if targetLanguage changes before translation starts
    return () => {};
    
  }, [rawLines, targetLanguage, isRawShown]);

  // Determine which lines to display
  const displayLines = isRawShown ? rawLines : translatedLines;

  return (
    <div className="w-full relative" data-testid={`email-content-${emailId}`}>
      {isTranslating && (
        <div className="absolute top-2 right-2 bg-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
          <Loader2 className="w-3 h-3 animate-spin text-red-500" />
          <span className="text-xs text-neutral-400">Translating...</span>
        </div>
      )}
      <div className="email-content-wrapper rounded-xl overflow-hidden bg-white p-2">
        {displayLines.map((line, lIdx) => {
          if (!isRawShown && lIdx === currentLine) { // Highlight only during translation
            const words = line.split(/\s+/);
            return (
              <div key={lIdx} className="whitespace-pre-wrap">
                {words.map((word, wIdx) => (
                  <span key={wIdx}>
                    {wIdx === currentWord ? <mark>{word}</mark> : word}{" "}
                  </span>
                ))}
              </div>
            );
          }
          return <div key={lIdx} className="whitespace-pre-wrap">{line || "\u00A0"}</div>;
        })}
      </div>
      {/* Small indicator for the language (optional, but helpful for UI) */}
      <div className="text-right text-xs text-neutral-500 mt-2">
         {isRawShown ? "Raw Content" : `Translated to: ${targetLanguage.toUpperCase()}`}
      </div>
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
    onSuccess: (data) => { setResults(data); toast({ title: t.emailFound, description: t.foundLatestEmail }); },
    onError: () => setResults(null),
  });

  function onSubmit(data, e) { if (e) { e.preventDefault(); e.stopPropagation(); } setResults(null); searchMutation.mutate(data); }

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
              )}/>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-10 rounded-lg" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t.searching}</span> : <span className="flex items-center gap-2"><Search className="h-4 w-4" />{t.findCode}</span>}
              </Button>
            </form>
          </Form>
        </motion.div>

        <AnimatePresence mode="wait">
          {results?.emails?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full space-y-4">
              <div className="text-center"><p className="text-neutral-400 text-sm">{t.latestNetflixEmail}</p></div>
              {results.emails.map((email, idx) => (
                <motion.div key={email.id || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
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
