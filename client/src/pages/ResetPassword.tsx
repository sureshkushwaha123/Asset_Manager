import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const schema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      toast({ title: "Invalid reset link", variant: "destructive" });
      navigate("/login");
    } else {
      setToken(t);
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (data: FormValues) => {
    if (!token) return;
    setIsPending(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      toast({ title: "Password reset successfully!" });
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      const msg = err?.message || "Failed to reset password. The link may have expired.";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] opacity-50 mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Password Reset!</h2>
            <p className="text-muted-foreground">Your password has been updated. Redirecting you to login...</p>
            <Link href="/login">
              <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90">
                Go to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold text-white mb-2">Set New Password</h1>
              <p className="text-muted-foreground">Choose a strong new password for your account</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white/80 ml-1">New Password</Label>
                <div className="relative">
                  <Input
                    {...form.register("newPassword")}
                    data-testid="input-new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl pr-10 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(s => !s)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.newPassword && (
                  <p className="text-sm text-destructive ml-1 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 ml-1">Confirm Password</Label>
                <div className="relative">
                  <Input
                    {...form.register("confirmPassword")}
                    data-testid="input-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl pr-10 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive ml-1 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                data-testid="button-reset-submit"
                disabled={isPending}
                className="w-full h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all duration-300"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
              </Button>
            </form>

            <p className="mt-6 text-center text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
