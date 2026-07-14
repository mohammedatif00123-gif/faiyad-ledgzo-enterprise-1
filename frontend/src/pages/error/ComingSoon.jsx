import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Mail, Construction, ArrowLeft, Bell, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function ComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Determine context based on the current path
  const isMeetings = location.pathname.includes('meetings');
  
  const content = isMeetings ? {
    title: "Virtual Meetings",
    description: "Enterprise-grade video conferencing built right into Ledgzo. No more switching apps.",
    icon: Video,
    features: [
      "HD Audio & Video calling up to 50 participants",
      "Screen sharing and interactive whiteboards",
      "Meeting recording and automatic AI transcriptions",
      "Calendar integrations (Google Workspace, Outlook)"
    ],
    eta: "Q4 2026",
    gradient: "from-blue-500/20 via-primary/20 to-purple-500/20"
  } : {
    title: "Internal Mailbox",
    description: "A secure, lightning-fast internal messaging and email system designed for your organization.",
    icon: Mail,
    features: [
      "End-to-end encrypted internal emails",
      "Smart inbox organization and labels",
      "Seamless attachment sharing up to 1GB",
      "Automated out-of-office replies and rules"
    ],
    eta: "Q1 2027",
    gradient: "from-emerald-500/20 via-primary/20 to-teal-500/20"
  };

  const Icon = content.icon;

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribed(true);
    toast.success("You'll be the first to know when it drops!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-2xl w-full"
      >
        <div className={`relative overflow-hidden glass-card p-1 rounded-3xl bg-gradient-to-br ${content.gradient} shadow-2xl border border-primary/10`}>
          <div className="bg-card/90 backdrop-blur-xl p-8 md:p-12 rounded-[22px] flex flex-col items-center space-y-8 h-full">
            
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Icon size={160} />
            </div>

            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative z-10"
            >
              <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full"></div>
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white p-5 rounded-2xl relative shadow-lg">
                <Icon size={40} />
              </div>
            </motion.div>

            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                In Active Development
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {content.title}
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                {content.description}
              </p>
            </div>

            <div className="w-full text-left bg-secondary/30 border p-6 rounded-2xl relative z-10">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-amber-500" /> What to expect:
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                {content.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Estimated Arrival:</span>
                <span className="font-bold text-primary">{content.eta}</span>
              </div>
            </div>

            <div className="w-full max-w-md relative z-10">
              <AnimatePresence mode="wait">
                {!isSubscribed ? (
                  <motion.form 
                    key="form"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onSubmit={handleSubscribe} 
                    className="flex gap-2"
                  >
                    <Input 
                      type="email" 
                      placeholder="Enter your email to get early access..." 
                      className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" className="shrink-0 group">
                      <Bell size={16} className="mr-2 group-hover:rotate-12 transition-transform" /> Notify Me
                    </Button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20"
                  >
                    <CheckCircle size={18} />
                    <span className="font-medium">You're on the waitlist!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
