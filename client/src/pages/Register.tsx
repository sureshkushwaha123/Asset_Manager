import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { useRegister } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";

const registerSchema = api.auth.register.input;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const register = useRegister();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: RegisterForm) => {
    register.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] opacity-50 mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-bl from-primary to-emerald-300 flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Join VaultAI</h1>
          <p className="text-muted-foreground">Start managing your wealth smarter today</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80 ml-1">Username</Label>
            <Input 
              id="username"
              {...form.register("username")}
              className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:ring-primary/50 focus:border-primary placeholder:text-white/20 transition-all"
              placeholder="Choose a username"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive ml-1">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80 ml-1">Password</Label>
            <Input 
              id="password"
              type="password"
              {...form.register("password")}
              className="bg-black/50 border-white/10 text-white h-12 rounded-xl focus:ring-primary/50 focus:border-primary placeholder:text-white/20 transition-all"
              placeholder="Create a strong password"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive ml-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all duration-300"
            disabled={register.isPending}
          >
            {register.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
