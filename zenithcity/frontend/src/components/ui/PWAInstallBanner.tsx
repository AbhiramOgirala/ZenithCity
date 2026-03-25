import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Plus, Share, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(userAgent);
    const android = /Android/.test(userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);

    // Detect if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed || standalone) {
      setDismissed(true);
      return;
    }

    // Check if prompt was already captured globally
    if ((window as any).pwaDeferredPrompt) {
      console.log('PWA install prompt already captured globally');
      setDeferredPrompt((window as any).pwaDeferredPrompt);
    }

    // Show banner on mobile devices after short delay
    const isMobile = iOS || android || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        console.log('Showing PWA install banner');
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Listen for install prompt (Chrome/Edge)
    const handler = (e: Event) => {
      console.log('PWA install prompt event received');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    console.log('Install button clicked');
    
    if (deferredPrompt) {
      // Chrome/Edge automatic install
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);
        
        if (outcome === 'accepted') {
          setShowBanner(false);
          localStorage.setItem('pwa-install-dismissed', 'true');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install prompt error:', error);
        setShowInstructions(true);
      }
    } else {
      // Show manual instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const closeInstructions = () => {
    setShowInstructions(false);
  };

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed) return null;

  return (
    <>
      {/* Install Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-sm"
          >
            <div className="pwa-install-banner">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-neon-cyan" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Install ZenithCity</p>
                <p className="text-xs text-space-400">
                  {isIOS 
                    ? 'Tap for installation steps' 
                    : isAndroid
                    ? 'Add to home screen for best experience'
                    : 'Install for offline access'
                  }
                </p>
              </div>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-xs font-bold hover:bg-neon-cyan/25 transition-all flex-shrink-0"
                aria-label="Install app"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Install
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
        )}
      </AnimatePresence>

      {/* Installation Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={closeInstructions}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-space-900 border border-space-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Install ZenithCity</h3>
                <button
                  onClick={closeInstructions}
                  className="text-space-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Follow these steps to install on iOS:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">1</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Tap the</span>
                        <Share className="w-4 h-4 text-blue-400" />
                        <span><strong>Share</strong> button</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">2</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Tap</span>
                        <Plus className="w-4 h-4 text-blue-400" />
                        <span><strong>"Add to Home Screen"</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">3</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Add"</strong> to confirm</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Follow these steps to install on Android:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">1</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Tap the</span>
                        <Menu className="w-4 h-4 text-space-400" />
                        <span><strong>menu</strong> (3 dots)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">2</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Add to Home Screen"</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-neon-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-neon-cyan font-bold text-sm">3</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Install"</strong> or <strong>"Add"</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Install from your browser:</p>
                  <div className="p-3 bg-space-800 rounded-lg">
                    <p className="text-sm text-white">
                      Look for the <strong>install icon</strong> in your browser's address bar, 
                      or check the browser menu for <strong>"Install ZenithCity"</strong> option.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={closeInstructions}
                className="w-full mt-6 py-3 bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan rounded-lg font-bold hover:bg-neon-cyan/25 transition-all"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}