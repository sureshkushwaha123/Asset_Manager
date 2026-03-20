import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { LayoutDashboard, Wallet, PieChart, Sparkles, LogOut, Menu, Landmark, Repeat, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/ProfileModal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: Wallet },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/advisor", label: "AI Advisor", icon: Sparkles },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const NavLinks = () => (
    <div className="space-y-2 flex-1 mt-8">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
            ${isActive 
              ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
            }
          `}>
            <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const UserCard = () => (
    <button
      data-testid="button-open-profile"
      onClick={() => setProfileOpen(true)}
      className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all duration-200 w-full text-left group"
    >
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
        {user?.username?.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-white truncate">{user?.username}</span>
        <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('ROLE_', '')}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-card/30 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-white">Vault<span className="text-primary">AI</span></span>
        </div>
        
        <NavLinks />

        <div className="mt-auto pt-6 border-t border-white/5">
          <UserCard />
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-white/5" onClick={logout}>
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-white">Vault<span className="text-primary">AI</span></span>
          </div>

          <div className="flex items-center gap-2">
            {/* Profile button on mobile */}
            <button
              data-testid="button-open-profile-mobile"
              onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm"
            >
              {user?.username?.charAt(0).toUpperCase()}
            </button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-background border-r border-white/5 p-6 flex flex-col">
                <div className="flex items-center gap-3 px-2 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-2xl font-bold text-white">Vault<span className="text-primary">AI</span></span>
                </div>
                <NavLinks />
                <Button variant="ghost" className="mt-auto justify-start text-muted-foreground" onClick={logout}>
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
