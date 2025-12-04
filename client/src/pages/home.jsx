import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

function EmailContent({ htmlContent, emailId }) {
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['target', 'rel'],
        ALLOW_DATA_ATTR: true,
      });
      
      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #1a1a1a !important;
              color: #e5e5e5 !important;
              line-height: 1.5;
            }
            a {
              color: #e50914 !important;
            }
            table {
              max-width: 100% !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
          </style>
        </head>
        <body>
          ${sanitizedHtml}
        </body>
        </html>
      `;
      
      doc.open();
      doc.write(styledHtml);
      doc.close();

      const checkHeight = () => {
        try {
          const height = doc.body.scrollHeight;
          if (height > 0) {
            setIframeHeight(Math.min(height + 32, 800));
          }
        } catch (e) {}
      };

      setTimeout(checkHeight, 100);
      setTimeout(checkHeight, 500);
      setTimeout(checkHeight, 1000);
    }
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      title={`email-content-${emailId}`}
      className="w-full border-0 rounded-lg bg-neutral-900"
      style={{ height: `${iframeHeight}px`, minHeight: '300px' }}
      sandbox="allow-same-origin"
      data-testid={`iframe-email-${emailId}`}
    />
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
      toast({
        title: "Emails Found",
        description: `Found ${data.totalCount} Netflix email(s) from the last 16 minutes.`,
      });
    },
    onError: (error) => {
      setResults(null);
    },
  });

  function onSubmit(data) {
    setResults(null);
    searchMutation.mutate(data);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 bg-neutral-950">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-6 py-8"
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
            <h2 className="text-lg font-medium text-white">Find Access Code</h2>
            <p className="text-neutral-500 text-xs mt-1">
              Enter the email to search for codes (last 16 minutes)
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-400 text-sm">Email Address</FormLabel>
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
                  Found <span className="text-primary font-semibold">{results.totalCount}</span> email(s) from the last 16 minutes
                </p>
              </div>

              {results.emails.map((email, index) => (
                <motion.div
                  key={email.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden"
                  data-testid={`card-email-${index}`}
                >
                  <div className="p-4 border-b border-neutral-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xl font-bold">N</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white text-sm">Netflix</span>
                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-neutral-400 text-xs truncate" data-testid={`text-subject-${index}`}>
                            {email.subject}
                          </p>
                        </div>
                      </div>
                      <span className="text-neutral-500 text-xs flex-shrink-0">
                        {new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  <div className="p-2">
                    <EmailContent 
                      htmlContent={email.htmlContent} 
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
          Searches your admin inbox for Netflix codes (last 16 minutes)
        </p>
      </motion.div>
    </div>
  );
}
