import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Transactions from "@/pages/Transactions";
import Subscriptions from "@/pages/Subscriptions";
import Budgets from "@/pages/Budgets";
import AIAdvisor from "@/pages/AIAdvisor";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute><Dashboard /></ProtectedRoute>}
      </Route>
      <Route path="/accounts">
        {() => <ProtectedRoute><Accounts /></ProtectedRoute>}
      </Route>
      <Route path="/subscriptions">
        {() => <ProtectedRoute><Subscriptions /></ProtectedRoute>}
      </Route>
      <Route path="/transactions">
        {() => <ProtectedRoute><Transactions /></ProtectedRoute>}
      </Route>
      <Route path="/budgets">
        {() => <ProtectedRoute><Budgets /></ProtectedRoute>}
      </Route>
      <Route path="/advisor">
        {() => <ProtectedRoute><AIAdvisor /></ProtectedRoute>}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
