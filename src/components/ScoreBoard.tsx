import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMatch } from "../context/MatchContext";
import { Trophy, Users, Zap, RotateCcw, Crown, HelpCircle, Volume2, VolumeX } from "lucide-react";

export default function ScoreBoard() {
  const { theme } = useTheme();
  const { 
    players, 
    activePlayerIndex, 
    mode, 
    rule, 
    isMatchStarted, 
    rotationPlayersQueue,
    kingStreak,
    historyMatchArchive,
    resetMatch,
    pivotRotationKing,
    board,
    contestationBonuses
  } = useMatch();

  // Helper to count played & remaining tiles
  const getPlayedCount = () => {
    let count = 0;
    if (board) {
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (board[r][c]) {
            count++;
          }
        }
      }
    }
    return count;
  };

  const playedCount = getPlayedCount();
  const remainingCount = Math.max(0, 102 - playedCount);

  const isLeading = (index: number) => {
    const scores = players.map(p => p.score);
    const max = Math.max(...scores);
    if (scores.every(s => s === 0)) return false;
    return players[index].score === max;
  };

  const player0 = players[0];
  const player1 = players[1];

  const [autoVocalize, setAutoVocalize] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scrabble_arena_auto_vocalize") === "true";
    }
    return false;
  });

  const prevScore0 = useRef(player0 ? player0.score : 0);
  const prevScore1 = useRef(player1 ? player1.score : 0);

  const getSpeechPhrase = () => {
    if (!player0 || !player1) return "";
    if (player0.score === 0 && player1.score === 0) {
      return "Le match commence à égalité.";
    }
    if (player0.score === player1.score) {
      return `Égalité parfaite, ${player0.score} points partout.`;
    }
    const leader = player0.score > player1.score ? player0 : player1;
    const opponent = player0.score > player1.score ? player1 : player0;
    const diff = leader.score - opponent.score;
    return `${leader.name} mène de ${diff} point${diff > 1 ? "s" : ""}. Le score est de ${leader.score} à ${opponent.score}.`;
  };

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech synthesis error", e);
      }
    }
  };

  useEffect(() => {
    if (!player0 || !player1) return;

    const currentScore0 = player0.score;
    const currentScore1 = player1.score;

    const hasChanged = currentScore0 !== prevScore0.current || currentScore1 !== prevScore1.current;
    
    prevScore0.current = currentScore0;
    prevScore1.current = currentScore1;

    if (hasChanged && autoVocalize) {
      const phrase = getSpeechPhrase();
      if (phrase) {
        const timer = setTimeout(() => {
          speakText(phrase);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [player0?.score, player1?.score, autoVocalize]);

  // Point gap styled React elements
  const renderGapMessage = () => {
    if (!player0 || !player1) {
      return <span className="text-xs font-semibold text-slate-500">Match à égalité (0 - 0)</span>;
    }
    if (player0.score > player1.score) {
      const diff = player0.score - player1.score;
      return (
        <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
          <strong className="text-sm md:text-base font-extrabold text-amber-500 dark:text-amber-400">
            {player0.name}
          </strong>{" "}
          mène de{" "}
          <strong className="text-sm md:text-base font-extrabold text-rose-500 dark:text-rose-400">
            {diff}
          </strong>{" "}
          point{diff > 1 ? "s" : ""} <span className="text-[11px] text-slate-400 font-mono">({player0.score} vs {player1.score})</span>
        </span>
      );
    } else if (player1.score > player0.score) {
      const diff = player1.score - player0.score;
      return (
        <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
          <strong className="text-sm md:text-base font-extrabold text-amber-500 dark:text-amber-400">
            {player1.name}
          </strong>{" "}
          mène de{" "}
          <strong className="text-sm md:text-base font-extrabold text-rose-500 dark:text-rose-400">
            {diff}
          </strong>{" "}
          point{diff > 1 ? "s" : ""} <span className="text-[11px] text-slate-400 font-mono">({player1.score} vs {player0.score})</span>
        </span>
      );
    } else if (player0.score === player1.score && player0.score > 0) {
      return (
        <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
          Égalité parfaite (<strong className="text-sm md:text-base font-extrabold text-amber-500">{player0.score}</strong> partout)
        </span>
      );
    } else {
      return <span className="text-xs font-semibold text-slate-500">Match à égalité (0 - 0)</span>;
    }
  };

  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${
      theme === "dark" 
        ? "bg-slate-900/80 border-slate-800 text-slate-100" 
        : "bg-white border-slate-200 text-slate-800 shadow-sm"
    }`}>
      {/* Mini Title config display */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-500/10 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
          <span className="font-semibold font-display text-sm">Tableau d'Arbitrage</span>
          <div className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-500/5 text-slate-500 font-bold dark:bg-slate-950 flex items-center gap-2">
            <span>Jouées : <strong className="text-amber-500 font-extrabold">{playedCount}</strong></span>
            <span className="opacity-40">|</span>
            <span>Restantes : <strong className="text-emerald-500 font-extrabold">{remainingCount}</strong></span>
          </div>
        </div>

        {/* Action reset match directly online if wanted */}
        {isMatchStarted && (
          <button
            onClick={resetMatch}
            className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-mono font-bold transition-all cursor-pointer ${
              theme === "dark"
                ? "border-slate-800 hover:border-red-500/55 hover:bg-slate-950 text-slate-400 hover:text-red-400"
                : "border-slate-200 hover:border-red-500/55 hover:bg-slate-50 text-slate-600 hover:text-red-500"
            }`}
            title="Réinitialiser l'arène"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Primary Player Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {players.map((p, idx) => {
          const isActive = idx === activePlayerIndex;
          const leading = isLeading(idx);
          const isCurrentKing = mode === "ROTATION_ROI" && idx === 0;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                isActive
                  ? theme === "dark"
                    ? "bg-slate-950 border-amber-500/50 shadow-md shadow-amber-550/10"
                    : "bg-amber-100/50 border-amber-400 shadow-md"
                  : theme === "dark"
                    ? "bg-slate-955 border-slate-850"
                    : "bg-slate-50 border-slate-100"
              }`}
            >
              {/* Leader crown subtle overlay */}
              {leading && (
                <div className="absolute top-1.5 right-1.5 flex items-center justify-center p-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="text-[9px] font-mono font-bold leading-none">CROWN 👑</span>
                </div>
              )}

              {/* Contestation Bonus Badge */}
              {contestationBonuses && contestationBonuses[p.name] > 0 && (
                <div className="absolute top-1.5 left-1.5 flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 text-[9px] font-mono font-bold leading-none animate-bounce" style={{ animationDuration: '3s' }}>
                  ★ BONUS +{contestationBonuses[p.name]} ⚡
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isActive ? "bg-amber-500 animate-ping" : "bg-slate-400/50"}`} />
                  <span className="text-xs font-semibold font-display truncate max-w-[84px]">{p.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 block">
                  {isCurrentKing ? `Le Roi 👑 (Série: ${kingStreak})` : idx === 0 ? "Débutant" : "Défenseur"}
                </span>
              </div>

              {/* Big central score display */}
              <div className="pt-3 flex items-baseline justify-between">
                <span className={`text-4xl font-extrabold font-display leading-none tracking-tight ${
                  isActive ? "text-amber-500" : ""
                }`}>
                  {p.score}
                </span>
                <span className="text-[10px] font-mono text-slate-500">PTS</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gap & Vocal Reading Row */}
      {player0 && player1 && (
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all ${
          theme === "dark" 
            ? "bg-slate-950/60 border-slate-850" 
            : "bg-slate-50 border-slate-100"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Écart de score</span>
              <div className="truncate pr-1">
                {renderGapMessage()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto Read Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !autoVocalize;
                setAutoVocalize(nextVal);
                localStorage.setItem("scrabble_arena_auto_vocalize", String(nextVal));
              }}
              className={`px-2 py-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                autoVocalize
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25"
                  : theme === "dark"
                    ? "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-300"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-705"
              }`}
              title={autoVocalize ? "Annonce vocale automatique activée" : "Activer l'annonce vocale complète"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${autoVocalize ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              Annonce auto
            </button>

            {/* Speech Read Manual Trigger */}
            <button
              type="button"
              onClick={() => speakText(getSpeechPhrase())}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-850 hover:border-amber-500/40 text-slate-300 hover:text-amber-400"
                  : "bg-white border-slate-200 hover:border-amber-500/40 text-slate-600 hover:text-orange-500"
              }`}
              title="Lire l'écart de score vocalement"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}



    </div>
  );
}
