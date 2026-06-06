/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { MatchProvider } from "./context/MatchContext";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Sparkles, Home as HomeIcon, Trophy, RotateCw, BarChart3 } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import Home from "./pages/Home";
import SetupRotation from "./pages/SetupRotation";
import Match from "./pages/Match";
import HistoriqueGbolo from "./pages/HistoriqueGbolo";
import LiveGbolo from "./pages/LiveGbolo";

function Shell() {
  const { theme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isLivePage = location.pathname.startsWith("/live/");

  if (isLivePage) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>
        <Routes>
          <Route path="/live/:codeGbolo" element={<LiveGbolo />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 pb-20 sm:pb-0 ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Universal Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all ${
        theme === "dark" 
          ? "bg-slate-950/80 border-slate-900/90" 
          : "bg-white/80 border-slate-200/90"
      }`}>
        <div className="max-w-6xl w-full mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity animate-fade-in">
            <Sparkles className="h-5.5 w-5.5 text-amber-500" />
            <span className="font-bold font-display text-lg tracking-tight">Scrabble Arena</span>
          </Link>

          {/* Quick Header Nav Links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 text-xs font-semibold font-display rounded-lg transition-all flex items-center gap-1.5 ${
                isActive("/")
                  ? theme === "dark"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "bg-amber-100/70 text-amber-800 border border-amber-200"
                  : theme === "dark"
                    ? "border border-transparent text-slate-400 hover:text-white hover:bg-slate-900"
                    : "border border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <HomeIcon className="h-3.5 w-3.5" /> Accueil
            </Link>
            <Link
              to="/gestion-joueurs"
              className={`px-3 py-1.5 text-xs font-semibold font-display rounded-lg transition-all flex items-center gap-1.5 ${
                isActive("/gestion-joueurs") || isActive("/setup-rotation")
                  ? theme === "dark"
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                    : "bg-orange-100/70 text-orange-850 border border-orange-200"
                  : theme === "dark"
                    ? "border border-transparent text-slate-400 hover:text-white hover:bg-slate-900"
                    : "border border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" /> Joueurs 👑
            </Link>
            <Link
              to="/match"
              className={`px-3 py-1.5 text-xs font-semibold font-display rounded-lg transition-all flex items-center gap-1.5 ${
                isActive("/match")
                  ? theme === "dark"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-emerald-100/70 text-emerald-800 border border-emerald-200"
                  : theme === "dark"
                    ? "border border-transparent text-slate-400 hover:text-white hover:bg-slate-900"
                    : "border border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" /> Match
            </Link>
          </nav>

          {/* Action toggle placeholder */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start sm:justify-center">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup-rotation" element={<SetupRotation />} />
          <Route path="/gestion-joueurs" element={<SetupRotation />} />
          <Route path="/historique-gbolo" element={<HistoriqueGbolo />} />
          <Route path="/match" element={<Match />} />
        </Routes>
      </main>

      {/* Universal Bottom Bar Navigation for Native PWA feel on Mobile */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg px-4 py-2 transition-all flex justify-around items-center ${
        theme === "dark"
          ? "bg-slate-950/90 border-slate-900"
          : "bg-white/90 border-slate-200/80 shadow-2xl"
      }`}>
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive("/")
              ? "text-amber-500"
              : "text-slate-400"
          }`}
        >
          <HomeIcon className="h-5 w-5" />
          <span className="text-[10px] font-bold font-display uppercase tracking-wider">Accueil</span>
        </Link>
        <Link
          to="/gestion-joueurs"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive("/gestion-joueurs") || isActive("/setup-rotation")
              ? "text-orange-500"
              : "text-slate-400"
          }`}
        >
          <RotateCw className="h-5 w-5" />
          <span className="text-[10px] font-bold font-display uppercase tracking-wider font-semibold">Joueurs</span>
        </Link>
        <Link
          to="/match"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isActive("/match")
              ? "text-emerald-500"
              : "text-slate-400"
          }`}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-[10px] font-bold font-display uppercase tracking-wider">Match</span>
        </Link>
      </div>

      {/* Universal Footer */}
      <footer className={`border-t py-4 text-center text-[10px] sm:text-xs font-mono transition-colors ${
        theme === "dark" ? "border-slate-900 text-slate-600" : "border-slate-200 text-slate-400"
      }`}>
        Scrabble Arena • Console d'Arbitrage Officielle de Club ⏱️
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MatchProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </MatchProvider>
    </ThemeProvider>
  );
}
