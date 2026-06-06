import { useTheme } from "../context/ThemeContext";
import { useMatch } from "../context/MatchContext";
import { RotateCw, Trophy, Crown, Play, BarChart3, Users, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const { theme } = useTheme();
  const { isMatchStarted, players } = useMatch();
  const navigate = useNavigate();

  const activeKing = players[0];
  const activeChallenger = players[1];

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-fade-in pb-10">
      {/* Visual Identity & Title */}
      <div className="text-center space-y-3.5">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/15">
          👑 Arbitrer & Régner
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500">
            Scrabble Arena
          </h2>
          <p className={`text-xs sm:text-sm font-sans max-w-md mx-auto leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Console d'arbitrage officielle de club pour les tournois de Scrabble Gbôlô en temps réel.
          </p>
        </div>
      </div>

      {/* Primary Navigation Cards */}
      <div className="flex flex-col gap-3.5 sm:gap-4 px-1 sm:px-0">
        
        {/* Card 1: Organiser Gbôlô */}
        <Link
          to="/gestion-joueurs"
          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
            theme === "dark"
              ? "bg-slate-900/80 border-slate-800 hover:border-orange-500/40 hover:bg-slate-900"
              : "bg-white border-slate-200 hover:border-orange-500/40 hover:shadow-lg hover:shadow-slate-200/50"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-2.5 sm:p-3.5 bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-orange-500 rounded-xl sm:rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold font-display text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                Organiser Gbôlô 👑
              </h3>
              <p className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 break-words line-clamp-2`}>
                Gérer les participants, la file d'attente et l'ordre d'arrivée.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
        </Link>

        {/* Card 2: Reprendre Match */}
        <div
          onClick={() => {
            if (isMatchStarted) {
              navigate("/match");
            }
          }}
          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 sm:gap-4 ${
            isMatchStarted
              ? theme === "dark"
                ? "bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer hover:scale-[1.01]"
                : "bg-white border-emerald-555/35 hover:border-emerald-500 hover:shadow-lg hover:shadow-slate-200/50 cursor-pointer hover:scale-[1.01]"
              : "opacity-60 bg-slate-500/5 border-slate-500/10 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
              isMatchStarted
                ? "bg-emerald-500/10 text-emerald-500 animate-pulse"
                : "bg-slate-500/10 text-slate-400"
            }`}>
              <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold font-display text-sm sm:text-base tracking-tight">
                  Reprendre le Match 🎮
                </h3>
                {isMatchStarted && (
                  <span className="px-1.5 py-0.2 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 animate-pulse">
                    En cours
                  </span>
                )}
              </div>
              <p className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 break-words line-clamp-2`}>
                {isMatchStarted 
                  ? `Combat actif : ${activeKing?.name || "Roi"} vs ${activeChallenger?.name || "Challenger"}`
                  : "Aucun duel en cours. Commencez un tournoi dans le gestionnaire."
                }
              </p>
            </div>
          </div>
          {isMatchStarted && (
            <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
          )}
        </div>

        {/* Card 3: Historique Gbôlô */}
        <Link
          to="/historique-gbolo"
          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
            theme === "dark"
              ? "bg-slate-900/80 border-slate-800 hover:border-amber-500/40 hover:bg-slate-900"
              : "bg-white border-slate-200 hover:border-amber-500/40 hover:shadow-lg hover:shadow-slate-200/50"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-2.5 sm:p-3.5 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 text-amber-500 rounded-xl sm:rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold font-display text-sm sm:text-base tracking-tight">
                Historique Gbôlô 📊
              </h3>
              <p className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 break-words line-clamp-2`}>
                Consulter les statistiques globales et le journal des défis joués.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
        </Link>

      </div>
    </div>
  );
}
