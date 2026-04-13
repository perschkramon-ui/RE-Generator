import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  // Service worker update handling
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { setUpdateReady(true); },
    onOfflineReady() { /* silent */ },
  });

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Capture beforeinstallprompt — fire banner immediately
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner right away (not after a delay)
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setShowBanner(false);
    setDeferredPrompt(null);
  }

  // Update banner
  if (updateReady) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)] bg-white border border-blue-200 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <span className="text-2xl shrink-0">🔄</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Update verfügbar</p>
          <p className="text-xs text-gray-400">Neue Version jetzt laden</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 shrink-0"
        >
          Aktualisieren
        </button>
      </div>
    );
  }

  // Install banner — shown immediately when browser fires beforeinstallprompt
  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)] bg-white border border-blue-100 rounded-2xl shadow-2xl overflow-hidden">
      {/* Blue top bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
      <div className="p-4 flex items-start gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          RE
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">RE Generator installieren</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Als App installieren – direkt vom Startbildschirm, auch offline nutzbar
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-gray-300 hover:text-gray-500 text-xl leading-none shrink-0 mt-0.5"
          aria-label="Schließen"
        >
          ×
        </button>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => setShowBanner(false)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
        >
          Später
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Jetzt installieren
        </button>
      </div>
    </div>
  );
}
