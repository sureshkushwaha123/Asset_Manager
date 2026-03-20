import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { useLogin } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = api.auth.login.input;
type LoginForm = z.infer<typeof loginSchema>;

const forgotSchema = z.object({
  identifier: z.string().min(1, "Please enter your username"),
});
type ForgotForm = z.infer<typeof forgotSchema>;

export default function Login() {
  const login = useLogin();
  const { toast } = useToast();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [forgotPending, setForgotPending] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = (data: LoginForm) => {
    login.mutate(data);
  };

  const onForgotSubmit = async (data: ForgotForm) => {
    setForgotPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });
      const json = await res.json();
      if (json.resetLink) {
        setResetLink(json.resetLink);
      } else {
        setResetLink(null);
        toast({ title: json.message || "If that account exists, a reset link has been generated." });
      }
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setForgotPending(false);
    }
  };

  const handleCloseForgot = () => {
    setForgotOpen(false);
    setResetLink(null);
    forgotForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] opacity-50 mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your financial command center</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80 ml-1">Username</Label>
            <Input 
              id="username"
              data-testid="input-username"
              {...form.register("username")}
              className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:ring-primary/50 focus:border-primary placeholder:text-white/20 transition-all"
              placeholder="Enter your username"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive ml-1">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white/80 ml-1">Password</Label>
              <button
                type="button"
                data-testid="link-forgot-password"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <Input 
              id="password"
              data-testid="input-password"
              type="password"
              {...form.register("password")}
              className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:ring-primary/50 focus:border-primary placeholder:text-white/20 transition-all"
              placeholder="••••••••"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive ml-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            data-testid="button-login"
            className="w-full h-12 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all duration-300"
            disabled={login.isPending}
          >
            {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <p className="mt-8 text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors">
            Create one
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotOpen} onOpenChange={v => !v && handleCloseForgot()}>
        <DialogContent className="max-w-md bg-background border border-white/10 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/60">
          <div className="bg-gradient-to-br from-primary/15 to-transparent border-b border-white/10 p-6">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">Reset Your Password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your username and we'll generate a password reset link for you.
            </p>
          </div>

          <div className="p-6">
            {resetLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300">Reset link generated successfully!</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Your Reset Link</Label>
                  <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/10 rounded-xl">
                    <code className="text-xs text-primary break-all flex-1">{window.location.origin}{resetLink}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">This link expires in 15 minutes.</p>
                </div>
                <Link href={resetLink} onClick={handleCloseForgot}>
                  <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90">
                    Go to Reset Password Page
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleCloseForgot} className="w-full text-muted-foreground hover:text-white">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Username</Label>
                  <Input
                    {...forgotForm.register("identifier")}
                    data-testid="input-forgot-identifier"
                    placeholder="Enter your username"
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:border-primary"
                  />
                  {forgotForm.formState.errors.identifier && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      {forgotForm.formState.errors.identifier.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  data-testid="button-forgot-submit"
                  disabled={forgotPending}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90"
                >
                  {forgotPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseForgot}
                  className="w-full text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
