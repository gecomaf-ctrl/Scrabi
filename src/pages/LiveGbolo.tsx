/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { fetchGbolo, subscribeToGboloMatches, GboloDoc, MatchGboloDoc } from "../firebase";
import Board from "../components/Board";
import { 
  Trophy, 
  Tv, 
  Users, 
  Activity, 
  Check, 
  Clock, 
  History, 
  ArrowLeft, 
  Share2,
  RefreshCw,
  Crown,
  Volume2,
  Zap,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function LiveGbolo() {
  const { codeGbolo } = useParams<{ codeGbolo: string }>();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [gbolo, setGbolo] = useState<GboloDoc | null>(null);
  const [matches, setMatches] = useState<MatchGboloDoc[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch the Gbôlô metadata
  useEffect(() => {
    if (!codeGbolo) return;

    fetchGbolo(codeGbolo).then((res) => {
      setGbolo(res);
      setLoading(false);
    }).catch((err) => {
      console.error("Error fetching Gbôlô info:", err);
      setLoading(false);
    });
  }, [codeGbolo]);

  // Subscribe to matches updates in real-time
  useEffect(() => {
    if (!gbolo) return;

    const unsubscribe = subscribeToGboloMatches(gbolo.id, (updatedMatches) => {
      setMatches(updatedMatches);
    });

    return () => unsubscribe();
  }, [gbolo]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${theme === "dark" ? "bg-[#0b1329] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono tracking-tight font-semibold text-amber-500">Connexion au direct en cours...</p>
        </div>
      </div>
    );
  }

  if (!gbolo) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${theme === "dark" ? "bg-[#0b1329] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl border text-center space-y-5 bg-gradient-to-b from-red-500/5 to-transparent border-red-500/20">
          <div className="text-red-500 text-5xl">⚠️</div>
          <h2 className="font-bold font-display text-lg tracking-tight">Gbôlô Introuvable</h2>
          <p className="text-xs text-slate-400">Le code de session public <span className="font-mono font-bold text-slate-100">{codeGbolo?.toUpperCase()}</span> ne correspond à aucun Gbôlô actif enregistré.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 text-black hover:bg-amber-600 transition-all">
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Find active and recently completed matches
  const activeMatch = matches.find((m) => m.statut === "en_cours");
  const completedMatches = matches.filter((m) => m.statut === "termine");
  const latestCompletedMatch = completedMatches.length > 0 ? completedMatches[completedMatches.length - 1] : null;

  // Render variables depending on dynamic match context
  let displayMatch: MatchGboloDoc | null = null;
  let statusBadge = "En attente";
  let statusColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";

  if (activeMatch) {
    displayMatch = activeMatch;
    statusBadge = "LIVE - EN COURS";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse";
  } else if (latestCompletedMatch && matches[matches.length - 1]?.id === latestCompletedMatch.id) {
    displayMatch = latestCompletedMatch;
    statusBadge = "MATCH TERMINÉ";
    statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }

  // Construct real-time highlights for spectator
  const contestedHighlights: Record<string, "pending" | "green" | "red" | null> = {};
  if (displayMatch && displayMatch.contestState) {
    const cs = displayMatch.contestState;
    if (cs.isPending && cs.highlightedCells) {
      for (const cell of cs.highlightedCells) {
        contestedHighlights[cell] = "pending";
      }
    } else if (!cs.isPending && cs.verdict && cs.highlightedCells) {
      const status = cs.verdict === "valid" ? "green" : "red";
      for (const cell of cs.highlightedCells) {
        contestedHighlights[cell] = status;
      }
    }
  }

  // Inline players state to match the bento ScoreBoard look perfectly
  const players = [
    { name: displayMatch?.joueur1 || "Joueur 1", score: displayMatch?.score1 || 0 },
    { name: displayMatch?.joueur2 || "Joueur 2", score: displayMatch?.score2 || 0 }
  ];

  const isLeading = (index: number) => {
    const scores = players.map(p => p.score);
    const max = Math.max(...scores);
    if (scores.every(s => s === 0)) return false;
    return players[index].score === max;
  };

  const getPlayedCount = () => {
    let count = 0;
    if (displayMatch && displayMatch.board) {
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (displayMatch.board[r] && displayMatch.board[r][c]) {
            count++;
          }
        }
      }
    }
    return count;
  };

  const playedCount = getPlayedCount();
  const remainingCount = Math.max(0, 102 - playedCount);

  const player0 = players[0];
  const player1 = players[1];

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
          <strong className="text-sm md:text-base font-extrabold text-rose-500 dark:text-rose-455">
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
          <strong className="text-sm md:text-base font-extrabold text-rose-500 dark:text-rose-455">
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

  // Vocalize announcements toggle state for spectator stream
  const [autoVocalize, setAutoVocalize] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("spectator_arena_auto_vocalize") === "true";
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

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-[#060b18] text-slate-100" 
        : "bg-slate-50 text-slate-900"
    }`}>
      {/* Premium Top Broadcast Banner */}
      <header className={`sticky top-0 z-50 border-b shadow-sm ${
        theme === "dark" 
          ? "bg-[#0b1329]/95 border-slate-800 backdrop-blur-md" 
          : "bg-white/95 border-slate-200 backdrop-blur-md shadow-slate-100"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 self-start sm:self-auto">
            <Link
              to="/"
              id="back-home-button-live"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === "dark" 
                  ? "border-slate-800 text-slate-300 hover:bg-slate-900 bg-[#060b18]/60" 
                  : "border-slate-200 text-slate-700 hover:bg-slate-105 bg-white shadow-sm"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="p-2 sm:p-2.5 rounded-xl bg-[#cc8d39]/10 border border-[#cc8d39]/20 text-[#cc8d39] shrink-0">
              <Tv className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block leading-3">DIFFUSION ARENE LIVE</span>
              <h1 className="font-extrabold font-display text-xs sm:text-sm md:text-base tracking-tight truncate">
                {gbolo.nom}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#cc8d39]/10 text-amber-500 border border-amber-500/20 shrink-0">
              CODE : {gbolo.code_public}
            </span>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all shrink-0 cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400"
                  : "bg-white border-slate-200 hover:border-amber-500/40 text-slate-600 hover:text-amber-500 shadow-xs"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  Inviter
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container mirroring the centered Referee layout */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {!displayMatch || displayMatch.statut === "en_attente" ? (
            /* STATE WAITING FOR DUEL */
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-xl mx-auto space-y-6 p-8 border border-dashed rounded-3xl border-slate-500/20 bg-gradient-to-bottom from-[#cc8d39]/5 to-transparent mt-8"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-slate-500/5 border border-slate-500/10 flex items-center justify-center text-3xl mx-auto animate-pulse">
                  🏆
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 bg-amber-500 text-black font-bold text-xs rounded-full shadow-lg">
                  ⏳
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-black font-display text-lg tracking-tight text-amber-500 dark:text-amber-400">
                  Gbôlô en pause ou prochain duel imminent !
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  L'arbitre de la rotation n'a pas encore lancé de match actif, ou prépare les duellistes actuels.
                </p>
                <div className="text-[11px] font-mono text-amber-500/70 py-1 px-3 bg-[#cc8d39]/10 rounded-full inline-block mt-3 border border-amber-500/15">
                  📡 Mise à jour automatique en temps réel
                </div>
              </div>
            </motion.div>
          ) : (
            /* STATE LIVE MATCH BOARD - CENTERED SINGLE COLUMN LAYOUT MATCHING REFEREE SCREEN */
            <motion.div
              key={displayMatch.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 w-full max-w-3xl mx-auto items-stretch"
            >
              {/* Top: ScoreBoard styled exactly like ScoreBoard.tsx bento grid */}
              <div className="w-full">
                <div className={`p-5 rounded-2xl border space-y-4 ${
                  theme === "dark" 
                    ? "bg-slate-900/80 border-slate-800 text-slate-100" 
                    : "bg-white border-slate-200 text-slate-800 shadow-sm shadow-slate-100"
                }`}>
                  {/* Mini Title config display with dynamically counted remaining tiles */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-500/10 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
                      <span className="font-semibold font-display text-sm">Tableau des Scores Live</span>
                      <div className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-500/5 text-slate-500 font-bold dark:bg-slate-950 flex items-center gap-2">
                        <span>Jouées : <strong className="text-amber-500 font-extrabold">{playedCount}</strong></span>
                        <span className="opacity-40">|</span>
                        <span>Restantes : <strong className="text-emerald-500 font-extrabold">{remainingCount}</strong></span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded tracking-wide ${statusColor}`}>
                      {statusBadge}
                    </span>
                  </div>

                  {/* Primary Player Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {players.map((p, idx) => {
                      const isActive = idx === displayMatch!.activePlayerIndex;
                      const leading = isLeading(idx);

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                            isActive && displayMatch!.statut === "en_cours"
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

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${isActive && displayMatch!.statut === "en_cours" ? "bg-amber-500 animate-ping" : "bg-slate-400/50"}`} />
                              <span className="text-xs font-semibold font-display truncate max-w-[84px]">{p.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {isActive && displayMatch!.statut === "en_cours" ? "En train de réfléchir ⚡" : "En attente"}
                            </span>
                          </div>

                          {/* Big central score display */}
                          <div className="pt-3 flex items-baseline justify-between">
                            <span className={`text-4xl font-extrabold font-display leading-none tracking-tight ${
                              isActive && displayMatch!.statut === "en_cours" ? "text-amber-500" : ""
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
                        ? "bg-slate-955 border-slate-850" 
                        : "bg-slate-50 border-slate-105"
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
                            localStorage.setItem("spectator_arena_auto_vocalize", String(nextVal));
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
                              : "bg-white border-slate-200 hover:border-amber-500/40 text-slate-600 hover:text-amber-500"
                          }`}
                          title="Lire l'écart de score vocalement"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: Centered 15x15 Spectating Board representation */}
              <div className="flex flex-col items-center justify-center w-full px-1 sm:px-2 gap-2">
                <div className="flex items-center gap-1.5 px-0.5 justify-center mt-1">
                  <LayoutGrid className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <h3 className="font-bold font-display text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">Plateau de Jeu Direct</h3>
                </div>

                <div className="space-y-4 w-full">
                  {/* Live ODS9 Checking Verification Banners */}
                  <AnimatePresence mode="wait">
                    {displayMatch.contestState && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden"
                      >
                        {displayMatch.contestState.isPending ? (
                          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-amber-500/5 animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
                                <RefreshCw className="h-5 w-5 animate-spin" />
                              </div>
                              <div>
                                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#cc8d39] block leading-none mb-1">ARBITRAGE EN DIRECT</span>
                                <h4 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                                  Vérification de coup contesté...
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                  Mot en cours d'examen : <span className="font-extrabold text-amber-500">"{displayMatch.contestState.word}"</span> ({displayMatch.contestState.coordinates})
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 py-1 px-2.5 rounded-full self-start sm:self-auto font-black shrink-0 uppercase tracking-wider">
                              Vérification ODS9 🔍
                            </span>
                          </div>
                        ) : (
                          <div className={`p-4 rounded-2xl border ${
                            displayMatch.contestState.verdict === "valid"
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 shadow-md shadow-emerald-500/5"
                              : "border-rose-500/30 bg-rose-500/5 text-rose-500 shadow-md shadow-rose-500/5"
                          } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                displayMatch.contestState.verdict === "valid"
                                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-500"
                                  : "bg-rose-500/10 border border-rose-500/25 text-rose-500"
                              }`}>
                                {displayMatch.contestState.verdict === "valid" ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <Activity className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <span className={`text-[10px] font-mono font-extrabold uppercase tracking-widest block leading-none mb-1 ${
                                  displayMatch.contestState.verdict === "valid" ? "text-emerald-500" : "text-rose-500"
                                }`}>VERDICT ARBITRAL</span>
                                <h4 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                                  {displayMatch.contestState.verdict === "valid" ? "✅ Coup validé !" : "❌ Coup rejeté !"}
                                </h4>
                                <p className="text-xs text-slate-550 dark:text-slate-400 font-mono mt-0.5">
                                  Le mot <span className={`font-extrabold uppercase ${
                                    displayMatch.contestState.verdict === "valid" ? "text-emerald-500" : "text-rose-500"
                                  }`}>"{displayMatch.contestState.word}"</span> est jugé {displayMatch.contestState.verdict === "valid" ? "correct et validé par ODS9." : "incorrect et annulé !"}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[10px] sm:text-xs font-mono py-1 px-3 rounded-full self-start sm:self-auto font-black uppercase tracking-wider shrink-0 ${
                              displayMatch.contestState.verdict === "valid"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/15"
                            }`}>
                              {displayMatch.contestState.verdict === "valid" ? "COUP VALIDE" : "REJETÉ"}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Board 
                    board={displayMatch.board || Array(15).fill(null).map(() => Array(15).fill(""))} 
                    contestedHighlights={contestedHighlights}
                  />
                </div>
              </div>

              {/* Bottom: Played Coups History Stream layout matching MoveHistory card */}
              <div className="w-full max-w-[500px] mx-auto space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <History className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold font-display text-xs tracking-wider uppercase opacity-70">
                    Journal des Coups Directs
                  </h3>
                </div>

                <div className={`p-5 rounded-2xl border ${
                  theme === "dark" 
                    ? "bg-slate-900/80 border-slate-800 text-slate-100" 
                    : "bg-white border-slate-200 text-slate-800 shadow-sm"
                }`}>
                  {!displayMatch.history || displayMatch.history.length === 0 ? (
                    <div className="p-8 border border-dashed rounded-xl border-slate-500/20 text-center space-y-2 py-8">
                      <Users className="h-8 w-8 text-slate-500 mx-auto animate-pulse" />
                      <h4 className="font-semibold text-xs text-slate-400">Arène vierge</h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Les duellistes n'ont pas encore posé de mot validé sur la grille. Les coups apparaîtront ici au fur et à mesure.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {/* Chronological order - we iterate reverse to show the latest word on top inside spectator's feed */}
                      {[...displayMatch.history].reverse().map((h, hIdx) => {
                        const coupIndex = displayMatch!.history.length - 1 - hIdx;
                        const coupNumber = Math.floor(coupIndex / 2) + 1;
                        const isPass = h.word === "PASSE" || h.word === "PASSER";

                        return (
                          <div
                            key={h.id || hIdx}
                            className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition-all ${
                              h.isContested
                                ? "bg-red-500/5 border-red-500/15 opacity-70"
                                : isPass
                                  ? "bg-slate-500/5 border-slate-200/5 opacity-80"
                                  : theme === "dark"
                                    ? "bg-slate-950 border-slate-850 hover:border-slate-800"
                                    : "bg-slate-50 border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                                h.isContested
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : isPass
                                    ? "bg-slate-500/10 text-slate-500 border-slate-500/10"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/10"
                              }`}>
                                {h.isContested ? "FAUX CONTESTÉ" : isPass ? `Coup ${coupNumber} (Passé)` : `Coup ${coupNumber}`}
                              </span>
                              
                              <div className="flex flex-col min-w-0">
                                <span className={`font-bold text-sm tracking-wide uppercase truncate ${
                                  h.isContested
                                    ? "line-through text-red-500/60"
                                    : isPass
                                      ? "text-slate-500 italic font-medium"
                                      : "text-slate-800 dark:text-slate-100"
                                }`}>
                                  {h.word}
                                </span>
                                
                                <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {!isPass && `${h.coordinates} par `}<strong>{h.playerName}</strong>
                                </span>

                                {h.bonusPoints && h.bonusPoints > 0 && (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded tracking-wide block mt-1.5 self-start animate-pulse">
                                    ★ Bonus Contestation : +{h.bonusPoints} pts ! ⚡
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className={`font-bold text-xs font-mono shrink-0 ${
                              h.isContested
                                ? "text-red-500"
                                : isPass
                                  ? "text-slate-500"
                                  : "text-amber-500"
                            }`}>
                              {h.score} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
