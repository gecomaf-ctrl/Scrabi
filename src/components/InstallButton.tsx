import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { Download, Smartphone, X, Share2, PlusSquare, Sparkles, Check, Monitor } from "lucide-react";

interface InstallButtonProps {
  variant?: "header" | "banner";
}

export default function InstallButton({ variant = "header" }: InstallButtonProps) {
  const { theme } = useTheme();
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const checkStandalone = () => {
      const matchStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isAppleStandalone = (navigator as any).standalone === true;
      setIsStandalone(matchStandalone || isAppleStandalone);
    };

    // Check if platform is iOS
    const checkPlatform = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleMobile);
    };

    // Initial check
    checkStandalone();
    checkPlatform();
    
    if (window.deferredPrompt) {
      setIsInstallable(true);
    }

    // Event listeners for installation state updates
    const handleInstallable = () => {
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstallable(false);
      setIsStandalone(true);
    };

    window.addEventListener("pwa-installable", handleInstallable);
    window.addEventListener("pwa-installed", handleInstalled);

    return () => {
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("pwa-installed", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // If we have native prompt, trigger it
    if (window.deferredPrompt) {
      const promptEvent = window.deferredPrompt;
      promptEvent.prompt();
      try {
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          window.deferredPrompt = null;
          setIsInstallable(false);
        }
      } catch (err) {
        console.error("Installation prompt failed:", err);
      }
    } 
    // If it's iOS or does not support deferredPrompt directly, show fallback guides
    else {
      setShowGuideModal(true);
    }
  };

  // If already installed (standalone mode), render a sleek active badge or hide header variant
  if (isStandalone) {
    if (variant === "banner") {
      return (
        <div 
          id="pwa-installed-success-banner"
          className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all ${
            theme === "dark"
              ? "bg-emerald-950/10 border-emerald-500/20"
              : "bg-emerald-50/50 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight text-emerald-600 dark:text-emerald-400">
                Application Installée ! 📱
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vous utilisez actuellement Scrabble Arena dans son conteneur applicatif ultra-rapide.
              </p>
            </div>
          </div>
        </div>
      );
    }
    // Header variant can hide or show a subtle check on desktop
    return null;
  }

  // If the browser can't install it and it's not iOS (and we don't have deferredPrompt yet), 
  // we can show a general onboarding installer on the homepage, or make it always accessible
  // for premium polish.
  const canPrompt = isInstallable || isIOS;

  // Let's always show it in the Header when installable, or as an option.
  // For standard user comfort, show only if installable or on iOS
  if (!canPrompt && variant === "header") {
    // Return null in header if we can't trigger / support installation on the current platform
    return null;
  }

  if (variant === "header") {
    return (
      <>
        <button
          onClick={handleInstall}
          id="pwa-install-header-btn"
          className={`p-2 px-3 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer font-medium text-xs font-display ${
            theme === "dark"
              ? "bg-amber-950/20 border-amber-500/30 hover:bg-amber-500/10 text-amber-400 shadow-md shadow-amber-950/40"
              : "bg-amber-50 border-amber-200 hover:bg-amber-100/50 text-amber-700 shadow-sm"
          }`}
          title="Installer l'application"
        >
          <Download className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
          <span className="hidden xs:inline">Installer</span>
        </button>

        {/* Modal display for instructions */}
        {showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} theme={theme} />}
      </>
    );
  }

  // Large home page banner
  return (
    <>
      <div
        id="pwa-install-banner-card"
        className={`group p-4 sm:p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer relative overflow-hidden ${
          theme === "dark"
            ? "bg-slate-900/80 border-amber-500/10 hover:border-amber-500/40 hover:bg-slate-900"
            : "bg-white border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-slate-200/50"
        }`}
        onClick={handleInstall}
      >
        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl opacity-70 group-hover:bg-amber-500/20 transition-all pointer-events-none" />

        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="p-2.5 sm:p-3.5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-500 rounded-xl sm:rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold font-display text-sm sm:text-base tracking-tight flex items-center gap-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                <Sparkles className="h-4 w-4 text-amber-500" /> Installer Scrabble Arena 📱
              </h3>
              <span className="px-1.5 py-0.2 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/10">
                PWA
              </span>
            </div>
            <p className={`text-[10.5px] sm:text-xs leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Arbitrez hors-ligne, profitez de temps de chargement instantanés et d'une icôné d'application sur votre écran d'accueil sans passer par l'App Store.
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleInstall();
          }}
          className="w-full md:w-auto py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs sm:text-sm font-display flex items-center justify-center gap-1.5 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/10 active:scale-95 transition-all cursor-pointer relative z-10 shrink-0"
        >
          <Download className="h-4 w-4" /> Installer l'App
        </button>
      </div>

      {/* Modal display for instructions */}
      {showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} theme={theme} />}
    </>
  );
}

// Highly polished, customized guide Modal
interface GuideModalProps {
  onClose: () => void;
  isIOS: boolean;
  theme: string;
}

function GuideModal({ onClose, isIOS, theme }: GuideModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card container */}
      <div 
        className={`relative max-w-sm w-full p-6 pb-7 rounded-3xl border shadow-2xl transition-transform animate-scale-up z-10 ${
          theme === "dark"
            ? "bg-slate-950 border-slate-900 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-all border ${
            theme === "dark"
              ? "border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white"
              : "border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
          }`}
        >
          <X className="h-4 w-4" />
        </button>

        {isIOS ? (
          /* iOS Guided Instructions */
          <div className="space-y-5">
            <div className="text-center space-y-2 mt-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold font-display text-lg tracking-tight">
                Installer sur votre iPhone / iPad
              </h3>
              <p className={`text-[11.5px] leading-relaxed max-w-xs mx-auto ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Suivez ces instructions pour installer Scrabble Arena en 3 secondes depuis Safari :
              </p>
            </div>

            <div className="space-y-3.5 font-sans">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className={`p-1.5 px-2.5 text-xs font-mono font-bold rounded-lg ${
                  theme === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-700"
                }`}>
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Appuyez sur le bouton Partager</p>
                  <p className={`text-[10px] ${theme === "dark" ? "text-slate-550" : "text-slate-400"}`}>
                    C'est l'icône de partage dans la barre système Safari au bas de l'écran.
                  </p>
                  <div className="pt-1.5 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border text-[10px] font-bold font-mono bg-blue-500/10 text-blue-500 border-blue-500/20">
                      <Share2 className="h-3 w-3" /> Partager (Safari)
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className={`p-1.5 px-2.5 text-xs font-mono font-bold rounded-lg ${
                  theme === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-700"
                }`}>
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Sélectionnez "Sur l'écran d'accueil"</p>
                  <p className={`text-[10px] ${theme === "dark" ? "text-slate-550" : "text-slate-400"}`}>
                    Faites défiler le menu des options vers le bas et cliquez dessus.
                  </p>
                  <div className="pt-1.5 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border text-[10px] font-bold font-mono bg-amber-500/10 text-amber-500 border-amber-500/20">
                      <PlusSquare className="h-3 w-3" /> Sur l'écran d'accueil
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className={`p-1.5 px-2.5 text-xs font-mono font-bold rounded-lg ${
                  theme === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-700"
                }`}>
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Validez en cliquant sur "Ajouter"</p>
                  <p className={`text-[10px] ${theme === "dark" ? "text-slate-550" : "text-slate-400"}`}>
                    L'application apparaîtra auprès de vos autres applications mobiles.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs font-display hover:opacity-95 transition-all text-center cursor-pointer mt-1"
            >
              Compris ! 👌
            </button>
          </div>
        ) : (
          /* General Browser Instructions (like desktop safari / firefox or alternate android setups) */
          <div className="space-y-4">
            <div className="text-center space-y-2 mt-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Monitor className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold font-display text-lg tracking-tight">
                Comment installer l'Application ?
              </h3>
              <p className={`text-[11.5px] leading-relaxed max-w-xs mx-auto ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Scrabble Arena respecte les normes PWA de pointe. Vous pouvez l'ajouter à vos applications mobiles ou de bureau :
              </p>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="space-y-1">
                <p className="font-semibold">🖥️ Sur Ordinateur (Chrome, Edge) :</p>
                <p className={`text-[10.5px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Dans la barre d'adresse du navigateur en haut à droite, cliquez sur l'icône de téléchargement ou d'installation, puis confirmez l'installation.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">🤖 Sur Android (Chrome, Firefox, Opera) :</p>
                <p className={`text-[10.5px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Cliquez sur le menu en haut à droite (les 3 points) et sélectionnez <strong className="text-amber-500">"Installer l'application"</strong> ou <strong className="text-amber-500">"Ajouter à l'écran d'accueil"</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs font-display hover:opacity-95 transition-all text-center cursor-pointer mt-1"
            >
              J'ai compris ! 👍
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
