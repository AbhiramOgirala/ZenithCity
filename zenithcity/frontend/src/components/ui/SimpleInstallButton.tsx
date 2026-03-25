import { useState, useEffect } from 'react';
import { Download, Smartphone, Plus, Share, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function SimpleInstallButton() {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;

  // Don't show if already installed
  if (isStandalone) return null;

  useEffect(() => {
    // Check if prompt was already captured globally
    if ((window as any).pwaDeferredPrompt) {
      console.log('PWA install prompt already captured globally');
      setDeferredPrompt((window as any).pwaDeferredPrompt);
    }

    // Listen for install prompt (Chrome/Edge/Desktop browsers)
    const handler = (e: Event) => {
      console.log('PWA install prompt captured by SimpleInstallButton');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    console.log('Install button clicked, deferredPrompt:', !!deferredPrompt);
    
    if (deferredPrompt) {
      // Chrome/Edge automatic install
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install outcome:', outcome);
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install prompt error:', error);
        setShowModal(true);
      }
    } else {
      // Show manual instructions for iOS/Android or if prompt not available
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Simple Install Button */}
      <button
        onClick={handleClick}
        className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-xs font-bold rounded-lg hover:bg-neon-cyan/25 transition-all"
        aria-label="Install ZenithCity app"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* Installation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-space-900 border border-space-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Install ZenithCity</h3>
                    <p className="text-xs text-space-400">Add to your home screen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-space-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Install on iPhone/iPad:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold text-sm">1</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Tap the</span>
                        <Share className="w-4 h-4 text-blue-400" />
                        <span><strong>Share</strong> button (bottom of screen)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold text-sm">2</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Scroll down and tap</span>
                        <Plus className="w-4 h-4 text-blue-400" />
                        <span><strong>"Add to Home Screen"</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 font-bold text-sm">3</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Add"</strong> to confirm</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg">
                    <p className="text-xs text-neon-cyan">
                      💡 The app will appear on your home screen like a native app!
                    </p>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Install on Android:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 font-bold text-sm">1</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span>Tap the</span>
                        <Menu className="w-4 h-4 text-space-400" />
                        <span><strong>menu</strong> (3 dots in browser)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 font-bold text-sm">2</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-space-800 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold text-sm">3</span>
                      </div>
                      <div className="text-sm text-white">
                        <span>Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg">
                    <p className="text-xs text-neon-cyan">
                      💡 Look for an install banner at the bottom of your screen too!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-space-300">Install on Desktop:</p>
                  <div className="p-4 bg-space-800 rounded-lg">
                    <p className="text-sm text-white mb-2">
                      Look for the <strong>install icon</strong> in your browser's address bar.
                    </p>
                    <p className="text-sm text-space-400">
                      Or check your browser menu for <strong>"Install ZenithCity"</strong> option.
                    </p>
                  </div>
                  <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg">
                    <p className="text-xs text-neon-cyan">
                      💡 Works in Chrome, Edge, and other modern browsers
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
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