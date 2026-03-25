import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if already dismissed
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed || standalone) {
      setDismissed(true);
      return;
    }

    // For testing: show banner immediately on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('PWA install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install outcome:', outcome);
      if (outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // Show iOS instructions
      alert('To install this app on iOS:\n1. Tap the Share button\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-sm"
      >
        <div className="pwa-install-banner">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
            {isIOS ? (
              <Plus className="w-5 h-5 text-neon-cyan" aria-hidden="true" />
            ) : (
              <Smartphone className="w-5 h-5 text-neon-cyan" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install ZenithCity</p>
            <p className="text-xs text-space-400">
              {isIOS 
                ? 'Tap Share → Add to Home Screen' 
                : 'Add to home screen for the best experience'
              }
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-xs font-bold hover:bg-neon-cyan/25 transition-all flex-shrink-0"
            aria-label="Install app"
          >
            {isIOS ? (
              <>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                How
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Install
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="text-space-500 hover:text-white p-1 flex-shrink-0"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}