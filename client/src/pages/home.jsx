import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      return await res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Email Found",
        description: "Successfully retrieved the latest access code.",
      });
    },
    onError: (error) => {
      setResult(null);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message || "Could not find any relevant emails.",
      });
    },
  });

  function onSubmit(data) {
    setResult(null);
    searchMutation.mutate(data);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-background to-background">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-primary drop-shadow-lg tracking-widest">
            CODE GETTER
          </h1>
          <p className="text-muted-foreground text-lg font-light">
            Netflix Household Access & Temporary Codes
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-sans font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Find Access Code
            </CardTitle>
            <CardDescription>
              Enter the account email to search for the latest household verification code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="user@example.com" 
                            className="pl-9 bg-background/50 border-input focus-visible:ring-primary" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 text-lg transition-all duration-300 shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]"
                  disabled={searchMutation.isPending}
                  data-testid="button-find-code"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching Inbox...
                    </>
                  ) : (
                    "FIND CODE"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-l-4 border-l-green-500 bg-card/80 backdrop-blur overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-sans text-green-500 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Code Found
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(result.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-md bg-background/50 border border-border space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</p>
                    <p className="font-medium truncate">{result.subject}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Content Preview</p>
                    <div className="p-4 rounded-md bg-secondary/30 border border-border font-mono text-sm leading-relaxed max-h-40 overflow-y-auto">
                      {result.bodySnippet}
                    </div>
                  </div>

                  {result.accessCode && (
                    <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border border-dashed border-primary/30">
                      <span className="text-xs text-muted-foreground mb-1">ACCESS CODE</span>
                      <span className="text-4xl font-bold text-primary tracking-[0.2em]" data-testid="text-code-result">
                        {result.accessCode}
                      </span>
                    </div>
                  )}
                  
                  {result.link && (
                     <div className="pt-2">
                       <a 
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline break-all"
                       >
                         {result.link}
                       </a>
                     </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {searchMutation.isError && (
             <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
             >
               <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>
                   {searchMutation.error.message}
                 </AlertDescription>
               </Alert>
             </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center pt-8 opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-xs text-muted-foreground">
            Searches your admin inbox for Netflix household codes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
