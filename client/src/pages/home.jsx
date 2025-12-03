import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, AlertCircle, Loader2, Tv, Clock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export default function Home() {
  const { toast } = useToast();
  const [result, setResult] = useState(null);

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
      setResult(data);
      toast({
        title: "Email Found",
        description: "Netflix email retrieved successfully.",
      });
    },
    onError: (error) => {
      setResult(null);
    },
  });

  function onSubmit(data) {
    setResult(null);
    searchMutation.mutate(data);
  }

  function getMainLink(links) {
    if (!links || links.length === 0) return null;
    const verifyLink = links.find(l => l.includes("travel/verify") || l.includes("verify"));
    return verifyLink || links[0];
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-neutral-950">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header - Clean and Minimal */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary tracking-wider font-display">
            CODE GETTER
          </h1>
          <p className="text-neutral-500 text-sm">
            Netflix Household Access & Temporary Codes
          </p>
        </div>

        {/* Form Card - Minimal Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800"
        >
          <div className="text-center mb-5">
            <h2 className="text-lg font-medium text-white">Find Access Code</h2>
            <p className="text-neutral-500 text-xs mt-1">
              Enter the email to search for codes
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

        {/* Netflix-style Email Result - Dark Theme */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                
                {/* Netflix Header */}
                <div className="p-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xl font-bold">N</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white text-sm">Netflix</span>
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-neutral-500 text-xs">
                        {new Date(result.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-5">
                  {/* Netflix Logo */}
                  <div className="mb-4">
                    <span className="text-primary text-3xl font-bold">N</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-semibold text-white mb-4" data-testid="text-email-subject">
                    {result.subject || "Your temporary access code"}
                  </h2>

                  {/* Message */}
                  <p className="text-neutral-400 text-sm mb-3">
                    Hello,
                  </p>

                  <p className="text-neutral-400 text-sm mb-4">
                    We have received a request for a temporary access code. If it's you or someone who lives under your roof, you can get a temporary access code to watch Netflix.
                  </p>

                  {/* Device Info Box */}
                  <div className="bg-neutral-800 rounded-lg p-3 mb-5 border border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-700 rounded-lg flex items-center justify-center">
                        <Tv className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div className="text-xs text-neutral-400">
                        <p className="font-medium text-neutral-300">Request received on</p>
                        <p>
                          {new Date(result.receivedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main CTA Button */}
                  {result.allLinks && result.allLinks.length > 0 && (
                    <a
                      href={getMainLink(result.allLinks)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg text-center text-sm transition-colors"
                      data-testid="button-retrieve-code"
                    >
                      Retrieve the code
                    </a>
                  )}

                  {/* Expiry Notice */}
                  <div className="flex items-center gap-1.5 mt-3 text-neutral-500 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>* The link expires after 15 minutes.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Error Display */}
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

        {/* Footer */}
        <p className="text-center text-xs text-neutral-600">
          Searches your admin inbox for Netflix codes
        </p>
      </motion.div>
    </div>
  );
}
