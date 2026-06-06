/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState } from "react";
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
  RefreshCw
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
    // If the absolute last state changes to completed, show that until they spin off another
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
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#cc8d39]/10 border border-[#cc8d39]/20 text-[#cc8d39] shrink-0">
              <Tv className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block leading-3">DIFFUSION ARENE LIVE</span>
              <h1 className="font-extrabold font-display text-sm sm:text-base md:text-lg tracking-tight truncate">
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
                  Inviter spectateurs
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {!displayMatch || displayMatch.statut === "en_attente" ? (
            /* STATE AATING / WAITING FOR DUEL */
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
            /* STATE LIVE MATCH BOARD OR RECENTLY ENDED RECORD */
            <motion.div
              key={displayMatch.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Live Score Board and Interactive Scrabble Board */}
              <div className="lg:col-span-8 space-y-6">
                {/* Score panel inside an elegant display scoreboard card */}
                <div className={`p-4 sm:p-5 rounded-3xl border ${
                  theme === "dark"
                    ? "bg-[#0b1329]/80 border-slate-800"
                    : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-500/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className={`h-4.5 w-4.5 text-amber-500 ${displayMatch.statut === "en_cours" ? "animate-pulse" : ""}`} />
                      <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded tracking-wide ${statusColor}`}>
                        {statusBadge}
                      </span>
                    </div>
                    {displayMatch.updatedAt && (
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        MàJ à {new Date(displayMatch.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:gap-6">
                    {/* Player 1 details */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider mb-0.5">Joueur 1</span>
                      <h4 className="font-extrabold font-display text-sm sm:text-base md:text-lg tracking-tight truncate text-amber-500">
                        {displayMatch.joueur1}
                      </h4>
                      {displayMatch.activePlayerIndex === 0 && displayMatch.statut === "en_cours" && (
                        <span className="inline-block mt-1 text-[9px] font-mono font-black py-0.5 px-2 bg-amber-500 text-black uppercase rounded tracking-wider animate-pulse">
                          À votre tour ⚡
                        </span>
                      )}
                    </div>

                    {/* Digital display matching points */}
                    <div className="flex items-center justify-center shrink-0 px-2">
                      <div className="flex items-center gap-1.5 sm:gap-4">
                        <div className="px-4 py-2 sm:py-3.5 bg-black/30 rounded-2xl border border-slate-500/10 shadow-inner font-mono text-2xl sm:text-3.5xl font-black text-amber-500 select-none min-w-[70px] sm:min-w-[95px] text-center">
                          {displayMatch.score1}
                        </div>
                        <div className="font-black text-slate-500 text-sm sm:text-base">VS</div>
                        <div className="px-4 py-2 sm:py-3.5 bg-black/30 rounded-2xl border border-slate-500/10 shadow-inner font-mono text-2xl sm:text-3.5xl font-black text-amber-500 select-none min-w-[70px] sm:min-w-[95px] text-center">
                          {displayMatch.score2}
                        </div>
                      </div>
                    </div>

                    {/* Player 2 details */}
                    <div className="flex-1 text-center sm:text-right min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider mb-0.5">Joueur 2</span>
                      <h4 className="font-extrabold font-display text-sm sm:text-base md:text-lg tracking-tight truncate text-amber-500">
                        {displayMatch.joueur2}
                      </h4>
                      {displayMatch.activePlayerIndex === 1 && displayMatch.statut === "en_cours" && (
                        <span className="inline-block mt-1 text-[9px] font-mono font-black py-0.5 px-2 bg-amber-500 text-black uppercase rounded tracking-wider animate-pulse">
                          À votre tour ⚡
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Board Canvas representation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pl-1">
                    <h3 className="font-bold font-display text-xs text-slate-400 uppercase tracking-widest pl-1">
                      Plateau en Direct
                    </h3>
                  </div>

                  <AnimatePresence mode="wait">
                    {displayMatch && displayMatch.contestState && (
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

              {/* Right Column: Played Coups History list */}
              <div className="lg:col-span-4 space-y-4">
                <div className={`p-4 sm:p-5 rounded-3xl border h-full max-h-[85vh] overflow-y-auto ${
                  theme === "dark"
                    ? "bg-[#0b1329]/80 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-800 shadow-sm shadow-slate-100"
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-500/10 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <History className="h-4.5 w-4.5 text-amber-500" />
                      <h3 className="font-bold font-display text-xs uppercase tracking-wider">Coups Joués</h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {displayMatch.history?.length || 0} coups
                    </span>
                  </div>

                  {!displayMatch.history || displayMatch.history.length === 0 ? (
                    <div className="p-8 border border-dashed rounded-2xl border-slate-500/20 text-center space-y-2 py-12">
                      <Users className="h-8 w-8 text-slate-500 mx-auto animate-pulse" />
                      <h4 className="font-bold text-xs text-slate-400">Match vierge</h4>
                      <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                        Les duellistes n'ont pas encore posé de mot validé sur la grille.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Chronological order - we iterate reverse to show the latest word on top inside spectator's feed */}
                      {[...displayMatch.history].reverse().map((h, hIdx) => {
                        const coupIndex = displayMatch!.history.length - 1 - hIdx;
                        const coupNumber = Math.floor(coupIndex / 2) + 1;
                        const isPass = h.word === "PASSE" || h.word === "PASSER";

                        return (
                          <div
                            key={h.id || hIdx}
                            className={`p-3 rounded-2xl border text-xs flex flex-col space-y-1 transition-all ${
                              h.isContested
                                ? "bg-red-500/5 border-red-500/15 opacity-70"
                                : isPass
                                  ? "bg-slate-500/5 border-slate-200/5 opacity-80"
                                  : theme === "dark"
                                    ? "bg-slate-900/50 border-slate-800"
                                    : "bg-slate-50/50 border-slate-100"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                h.isContested
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : isPass
                                    ? "bg-slate-500/10 text-slate-500 border-slate-500/10"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/10"
                              }`}>
                                {h.isContested ? "FAUX CONTESTÉ" : isPass ? `Coup ${coupNumber} (Passé)` : `Coup ${coupNumber}`}
                              </span>
                              <span className={`font-mono font-black text-xs ${h.isContested ? "text-red-500" : "text-amber-500"}`}>
                                {h.score} pts
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className={`font-black tracking-wide text-sm uppercase ${
                                h.isContested
                                  ? "line-through text-red-500/60"
                                  : isPass
                                    ? "text-slate-500 italic"
                                    : "text-slate-205 dark:text-slate-100"
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
