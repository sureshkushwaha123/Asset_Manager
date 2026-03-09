import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAskAI } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, User, Loader2 } from "lucide-react";

type Message = {
  role: 'user' | 'ai';
  content: string;
};

export default function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I'm VaultAI. How can I help you manage your finances today? You can ask me about budgeting strategies, investment concepts, or analyzing your spending patterns." }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const askAI = useAskAI();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askAI.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || askAI.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput("");

    askAI.mutate(userMessage, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
      }
    });
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500 max-w-4xl mx-auto">
        <header className="mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-emerald-300 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">AI Financial Advisor</h1>
            <p className="text-muted-foreground">Get personalized insights and answers.</p>
          </div>
        </header>

        <Card className="flex-1 glass-card overflow-hidden flex flex-col border border-white/10">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'ai' 
                    ? 'bg-primary/20 text-primary border border-primary/30' 
                    : 'bg-white/10 text-white border border-white/20'
                }`}>
                  {msg.role === 'ai' ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-white/5 border border-white/5 text-white/90 rounded-tl-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {askAI.isPending && (
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="bg-white/5 border border-white/5 text-white/90 rounded-2xl rounded-tl-sm p-4 flex items-center">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="p-4 bg-black/40 border-t border-white/5">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about saving, investing, or your spending..."
                className="flex-1 bg-white/5 border-white/10 text-white h-14 rounded-xl focus:ring-primary/50 text-lg px-6"
                disabled={askAI.isPending}
              />
              <Button type="submit" disabled={!input.trim() || askAI.isPending} className="h-14 w-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
