import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useMatch } from "../context/MatchContext";
import { Trophy, Calendar, Sparkles, Trash2, Shield, Flame, UserCheck } from "lucide-react";

export default function AnnalsHistory() {
  const { theme } = useTheme();
  const { historyMatchArchive, clearHistoryMatchArchive } = useMatch();

  const handleClearArchive = () => {
    if (confirm("Voulez-vous vraiment vider toutes les annales de défis archivées ? Cette action est irréversible.")) {
      clearHistoryMatchArchive();
    }
  };

  // Compute brief stats
  const totalMatches = historyMatchArchive.length;
  const uniqueWinners = Array.from(new Set(historyMatchArchive.map(h => h.winnerName)));
  const highestScoreObj = historyMatchArchive.reduce((acc, current) => {
    const maxCurrent = Math.max(...current.players.map(p => p.score));
    return maxCurrent > acc.score ? { score: maxCurrent, name: current.players.find(p => p.score === maxCurrent)?.name || "" } : acc;
  }, { score: 0, name: "" });

  return (
    <div className={`p-5 rounded-2xl border space-y-4 animate-fade-in ${
      theme === "dark" 
        ? "bg-slate-900/80 border-slate-800 text-slate-100" 
        : "bg-white border-slate-200 text-slate-800 shadow-sm"
    }`}>
      {/* Title & Stats Grid */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-500/10">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
          <h3 className="font-semibold font-display text-sm">Annale des Défis Archivés</h3>
        </div>
        {totalMatches > 0 && (
          <button
            type="button"
            onClick={handleClearArchive}
            className="p-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 border-red-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Vider l'archive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[9px] font-mono font-bold uppercase tracking-wider">Vider</span>
          </button>
        )}
      </div>

      {totalMatches > 0 ? (
        <div className="space-y-4">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded-xl border ${theme === "dark" ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Défis Joués</span>
              <span className="text-sm font-extrabold text-amber-500 font-display">{totalMatches}</span>
            </div>
            <div className={`p-2 rounded-xl border ${theme === "dark" ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Arbitrés</span>
              <span className="text-sm font-extrabold text-orange-500 font-display">{uniqueWinners.length} VIP</span>
            </div>
            <div className={`p-2 rounded-xl border ${theme === "dark" ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Record Score</span>
              <span className="text-[10px] font-bold text-emerald-500 truncate block text-ellipsis overflow-hidden" title={`${highestScoreObj.name}: ${highestScoreObj.score} pts`}>
                {highestScoreObj.score} pts ({highestScoreObj.name})
              </span>
            </div>
          </div>

          {/* List of Archived Matches */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {historyMatchArchive.map((arch) => {
              const p1 = arch.players[0];
              const p2 = arch.players[1];
              const isP1Winner = arch.winnerName === p1?.name;
              const opponent = isP1Winner ? p2 : p1;
              const winner = isP1Winner ? p1 : p2;

              return (
                <div
                  key={arch.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                    theme === "dark"
                      ? "bg-slate-950/70 border-slate-850 hover:border-slate-800"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        arch.mode === "ROTATION_ROI"
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/10"
                          : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/10"
                      }`}>
                        {arch.mode === "ROTATION_ROI" ? "Roi de l'Arène" : "Duel 1v1"}
                      </span>
                      {arch.kingStreak > 1 && arch.mode === "ROTATION_ROI" && (
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Flame className="h-3 w-3 fill-amber-500 animate-pulse" />
                          Série: {arch.kingStreak}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {arch.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {arch.isDraw ? (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-xs sm:text-sm text-blue-500 truncate bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                            {p1?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">match nul</span>
                          <span className="font-bold text-xs sm:text-sm text-blue-500 truncate bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                            {p2?.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-xs sm:text-sm text-emerald-500 truncate bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            {winner?.name} ⭐
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">a battu</span>
                          <span className="text-xs sm:text-sm text-slate-500 font-medium truncate bg-slate-500/5 px-2 py-0.5 rounded border border-slate-500/10">
                            {opponent?.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono text-slate-700 dark:text-slate-300">
                        {arch.isDraw ? (
                          <>
                            {p1?.score} <span className="text-[9px] text-slate-400">vs</span> {p2?.score}
                          </>
                        ) : (
                          <>
                            {winner?.score} <span className="text-[9px] text-slate-400">vs</span> {opponent?.score}
                          </>
                        )}
                      </div>
                      <div className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                        {arch.isDraw ? (
                          "Égalité 🤝"
                        ) : (
                          `Écart: +${Math.abs((winner?.score || 0) - (opponent?.score || 0))} pts`
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-405">
            <Shield className="h-5 w-5" />
          </div>
          <p className="text-xs font-mono text-slate-500">
            Aucun défi n'a encore été archivé dans les annales.
          </p>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
            Dès que vous terminerez une manche en cliquant sur le bouton de pivotement/fin, le résultat sera automatiquement scellé ici.
          </p>
        </div>
      )}
    </div>
  );
}
