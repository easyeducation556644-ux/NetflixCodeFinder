import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2, ExternalLink } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

function ContentSegments({ segments, emailId }) {
  if (!segments || segments.length === 0) {
    return (
      <div className="text-neutral-500 text-sm text-center py-2">
        No content available
      </div>
    );
  }

  return (
    <div 
      className="space-y-2"
      data-testid={`content-${emailId}`}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <div key={index} className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
              {segment.value}
            </div>
          );
        }
        
        if (segment.type === "buttons" && segment.buttons) {
          const validButtons = segment.buttons.filter(btn => 
            btn.category !== "resetPassword" && 
            btn.category !== "manageDevices" && 
            btn.category !== "getCode"
          );
          
          if (validButtons.length === 0) return null;
          
          return (
            <div key={index} className="py-2 flex flex-wrap gap-2">
              {validButtons.map((btn, btnIndex) => (
                <a
                  key={btnIndex}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-base rounded-full shadow-lg shadow-red-900/30 hover:shadow-red-800/40 transition-all duration-200 hover:scale-105"
                  data-testid={`button-${btn.category || 'action'}-${emailId}-${btnIndex}`}
                >
                  <span>{btn.label}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          );
        }
        
        if (segment.type === "link" && segment.isMain) {
          const skipCategories = ["resetPassword", "manageDevices", "getCode"];
          if (skipCategories.includes(segment.category)) {
            return null;
          }
          
          return (
            <div key={index} className="py-3">
              <a
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-base rounded-full shadow-lg shadow-red-900/30 hover:shadow-red-800/40 transition-all duration-200 hover:scale-105"
                data-testid={`button-main-link-${emailId}-${index}`}
              >
                <span>{segment.label}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

function EmailContent({ email, emailId }) {
  const { rawHtml, contentSegments } = email;
  
  return (
    <div 
      className="w-full"
      data-testid={`email-content-${emailId}`}
    >
      <div 
        className="email-content-wrapper rounded-xl overflow-hidden bg-white"
        dangerouslySetInnerHTML={{ __html: rawHtml || "" }}
      />
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [results, setResults] = useState(null);

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
      const emailCount = data.emails?.length || data.totalCount || 0;
      toast({
        title: "Email Found",
        description: `Found the latest Netflix email.`,
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
      const form = event.target;
      if (form && form.action) {
        form.action = '';
        form.target = '';
      }
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
            CODE GETTER
          </h1>
          <p className="text-neutral-500 text-sm">
            Netflix Household Access & Temporary Codes
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800"
        >
          <div className="text-center mb-5">
            <h2 className="text-lg font-medium text-white">Find Latest Email</h2>
            <p className="text-neutral-500 text-xs mt-1">
              Enter the email to search for the latest Netflix email
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
                    <FormLabel className="text-white text-base font-bold">Enter Netflix Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input 
                          placeholder="user@example.com" 
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
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Find Code
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
                  Latest Netflix email
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
                <h3 className="text-red-400 font-medium text-sm">Search Failed</h3>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {searchMutation.error.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-neutral-600">
          Shows the latest Netflix email only
        </p>
      </motion.div>
    </div>
  );
}
