import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, Sparkles } from "lucide-react";

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
      const res = await apiRequest("POST", "/api/findcode", { email: data.email });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Request failed");
      }
      
      return json;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Email Found",
        description: data.accessCode 
          ? `Access code: ${data.accessCode}` 
          : "Email retrieved successfully.",
      });
    },
    onError: (error) => {
      setResult(null);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message,
      });
    },
  });

  function onSubmit(data) {
    setResult(null);
    searchMutation.mutate(data);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-black via-neutral-950 to-black overflow-hidden relative">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg space-y-10 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative inline-block"
          >
            <h1 className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-400 to-primary drop-shadow-2xl tracking-[0.15em] font-display">
              CODE GETTER
            </h1>
            <div className="absolute -inset-2 bg-primary/20 blur-2xl rounded-full -z-10" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-lg font-light tracking-wide"
          >
            Netflix Household Access & Temporary Codes
          </motion.p>
        </div>

        {/* 3D Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative"
          style={{ perspective: "1000px" }}
        >
          {/* Zigzag border decoration */}
          <div className="absolute -inset-[3px] rounded-3xl bg-gradient-to-r from-primary via-red-500 to-primary opacity-70 blur-sm" />
          <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-500 to-primary animate-gradient-x" 
                 style={{
                   backgroundSize: "200% 100%",
                   animation: "gradient-shift 3s ease infinite"
                 }} />
          </div>
          
          {/* Main card with 3D effect */}
          <div className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-3xl p-8 shadow-[0_25px_60px_-15px_rgba(229,9,20,0.3)] transform hover:scale-[1.02] transition-all duration-500">
            
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            {/* Header icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Find Access Code</h2>
              <p className="text-muted-foreground text-sm">
                Enter the account email to search for verification codes
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-red-500/50 to-primary/50 rounded-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity blur-sm" />
                          <div className="relative flex items-center">
                            <Mail className="absolute left-4 h-5 w-5 text-muted-foreground z-10" />
                            <Input 
                              placeholder="user@example.com" 
                              className="pl-12 pr-4 py-6 bg-neutral-800/80 border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all" 
                              {...field} 
                              data-testid="input-email"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                {/* Iconic rounded button with zigzag effect */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <div className="absolute -inset-[2px] bg-gradient-to-r from-primary via-orange-500 to-primary rounded-2xl opacity-80 blur-[2px] animate-pulse" />
                  <Button 
                    type="submit" 
                    className="relative w-full bg-gradient-to-r from-primary via-red-600 to-primary text-white font-bold py-7 text-lg rounded-2xl transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(229,9,20,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(229,9,20,0.7)] border-0 overflow-hidden group"
                    disabled={searchMutation.isPending}
                    data-testid="button-find-code"
                  >
                    {/* Button shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    
                    {searchMutation.isPending ? (
                      <span className="flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Searching Inbox...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        <Search className="h-5 w-5" />
                        FIND CODE
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {/* Success card border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 rounded-3xl opacity-60 blur-sm" />
              
              <div className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-3xl p-6 shadow-[0_20px_50px_-15px_rgba(34,197,94,0.2)]">
                
                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-6 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-400">Email Found</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.receivedAt).toLocaleDateString()} at {new Date(result.receivedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email info */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                    <p className="text-white font-medium" data-testid="text-email-subject">{result.subject}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span><span className="text-neutral-400">From:</span> {result.from}</span>
                      <span><span className="text-neutral-400">To:</span> {result.to}</span>
                    </div>
                  </div>

                  {/* Access Code Display */}
                  {result.accessCode && (
                    <motion.div 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-orange-500/20 to-primary/20 rounded-2xl" />
                      <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl border border-primary/30">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Access Code</span>
                        <div className="flex items-center gap-4">
                          <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary tracking-[0.3em] font-mono" data-testid="text-code-result">
                            {result.accessCode}
                          </span>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="rounded-xl hover:bg-primary/20"
                            onClick={() => {
                              navigator.clipboard.writeText(result.accessCode);
                              toast({ title: "Copied!", description: "Access code copied to clipboard" });
                            }}
                            data-testid="button-copy-code"
                          >
                            <Copy className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Netflix Links */}
                  {result.allLinks && result.allLinks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Netflix Links</p>
                      <div className="space-y-2">
                        {result.allLinks.slice(0, 3).map((link, index) => (
                          <a 
                            key={index}
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all text-sm break-all group"
                            data-testid={`link-netflix-${index}`}
                          >
                            <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email Content */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email Content</p>
                    <div 
                      className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700 text-sm text-neutral-300 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-neutral-600"
                      data-testid="text-email-content"
                    >
                      {result.textContent || "No content available"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Error Display */}
          {searchMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-r from-red-500/50 to-orange-500/50 rounded-2xl blur-sm" />
              <div className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Search Failed</h3>
                  <p className="text-neutral-400 text-sm">
                    {searchMutation.error.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-4"
        >
          <p className="text-xs text-neutral-600">
            Searches your admin inbox for Netflix household codes
          </p>
        </motion.div>
      </motion.div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
