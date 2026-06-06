import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMatch, regenerateBoard, MatchHistoryEntry } from "../context/MatchContext";
import { Trash2, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Pencil, Check, X, RefreshCw } from "lucide-react";
import { calculateScore } from "../logic/scrabbleEngine";

export default function MoveHistory() {
  const { theme } = useTheme();
  const { history, removeHistoryEntry, editHistoryEntry, contestHistoryEntry } = useMatch();
  const [isExpanded, setIsExpanded] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editCoords, setEditCoords] = useState("");
  const [editScore, setEditScore] = useState<number>(0);
  const [editBreakdown, setEditBreakdown] = useState("");

  const getBoardStateBeforeEntry = (entryId: string) => {
    const chronological = [...history].reverse();
    const index = chronological.findIndex(h => h.id === entryId);
    if (index === -1) return Array(15).fill(null).map(() => Array(15).fill(""));
    const entriesBefore = chronological.slice(0, index);
    return regenerateBoard(entriesBefore);
  };

  // Auto-calculated score when editing word or coordinates
  React.useEffect(() => {
    if (!editingId) return;
    const boardBefore = getBoardStateBeforeEntry(editingId);
    try {
      const sanitizedWord = editWord.trim();
      const sanitizedCoords = editCoords.trim().toUpperCase();
      if (sanitizedWord.length >= 2 && sanitizedCoords.length >= 2) {
        const result = calculateScore(sanitizedWord, sanitizedCoords, boardBefore);
        if (result) {
          setEditScore(result.total);
          setEditBreakdown(result.breakdown);
        }
      }
    } catch (e) {
      // Keep previous score or ignore parsing errors during typing
    }
  }, [editWord, editCoords, editingId]);

  const handleStartEdit = (entry: MatchHistoryEntry) => {
    setEditingId(entry.id);
    setEditWord(entry.word);
    setEditCoords(entry.coordinates);
    setEditScore(entry.score);
    setEditBreakdown(entry.breakdown || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleRecalculate = () => {
    if (!editingId) return;
    const boardBefore = getBoardStateBeforeEntry(editingId);
    try {
      const result = calculateScore(editWord.trim(), editCoords.trim().toUpperCase(), boardBefore);
      if (result) {
        setEditScore(result.total);
        setEditBreakdown(result.breakdown);
      }
    } catch (e) {
      // Keep previous
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    editHistoryEntry(editingId, editWord.trim(), editScore, editCoords.trim(), editBreakdown);
    setEditingId(null);
  };

  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${
      theme === "dark" 
        ? "bg-slate-900/80 border-slate-800 text-slate-100" 
        : "bg-white border-slate-200 text-slate-800 shadow-sm"
    }`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-500/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold font-display text-sm">Journal des Coups Arbitrés</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-500">
            {history.length} coups
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[10px] font-mono font-bold transition-all cursor-pointer ${
              theme === "dark"
                ? "border-slate-800 hover:border-amber-500/55 bg-slate-950 text-slate-400 hover:text-amber-400"
                : "border-slate-200 hover:border-amber-500/55 bg-slate-50 text-slate-600 hover:text-amber-500"
            }`}
          >
            {isExpanded ? "Replier" : "Déplier"}
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-fade-in space-y-3">
          {history.length === 0 ? (
            <div className="p-6 border border-dashed rounded-xl border-slate-500/20 text-center space-y-2 py-8">
              <AlertCircle className="h-7 w-7 text-slate-500 mx-auto animate-pulse" />
              <h4 className="font-semibold text-xs text-slate-400">Arène vierge</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Aucun coup n'a été arbitré pour le moment. Saisissez le premier mot dans le panneau de saisie.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {history.map((h, idx) => {
                const isEditing = editingId === h.id;
                const chronologicalIndex = history.length - 1 - idx;
                const coupNumber = Math.floor(chronologicalIndex / 2) + 1;

                if (isEditing) {
                  return (
                    <div
                      key={h.id}
                      className={`p-3.5 rounded-xl border space-y-3 ${
                        theme === "dark" ? "bg-slate-950 border-amber-500/50" : "bg-slate-100/70 border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">
                          Correction du coup #{coupNumber} ({h.playerName})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Word */}
                        <div>
                          <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Mot</label>
                          <input
                            type="text"
                            value={editWord}
                            onChange={(e) => setEditWord(e.target.value.replace(/[^a-zA-Z*]/g, ""))}
                            placeholder="ex: maRdi"
                            className={`w-full p-1.5 rounded-lg border text-xs font-semibold ${
                              theme === "dark" 
                                ? "bg-slate-900 border-slate-850 text-white" 
                                : "bg-white border-slate-200 text-slate-950"
                            }`}
                          />
                        </div>

                        {/* Coords */}
                        <div>
                          <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Coordonnée</label>
                          <input
                            type="text"
                            value={editCoords}
                            onChange={(e) => setEditCoords(e.target.value.toUpperCase())}
                            className={`w-full p-1.5 rounded-lg border text-xs font-mono font-semibold ${
                              theme === "dark" 
                                ? "bg-slate-900 border-slate-850 text-white" 
                                : "bg-white border-slate-200 text-slate-950"
                            }`}
                            placeholder="ex: H8"
                          />
                        </div>

                        {/* Score */}
                        <div>
                          <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Points calculés</label>
                          <input
                            type="number"
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value))}
                            className={`w-full p-1.5 rounded-lg border text-xs font-mono font-semibold ${
                              theme === "dark" 
                                ? "bg-slate-900 border-slate-850 text-white" 
                                : "bg-white border-slate-200 text-slate-950"
                            }`}
                          />
                        </div>
                      </div>

                      {editBreakdown && (
                        <div className="text-[9.5px] font-mono text-slate-400 leading-normal bg-black/10 dark:bg-black/40 p-2 rounded max-w-full break-words">
                          Score : {editBreakdown}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer ${
                            theme === "dark"
                              ? "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                          }`}
                        >
                          <X className="h-3 w-3" /> Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer shadow-sm shadow-green-600/10"
                        >
                          <Check className="h-3.5 w-3.5" /> Enregistrer
                        </button>
                      </div>
                    </div>
                  );
                }

                // Default reading state - Highly purified layout representing exactly: Coup #, Mot, Score
                const isPass = h.word === "PASSE" || h.word === "PASSER";
                return (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition-all ${
                      h.isContested
                        ? theme === "dark"
                          ? "bg-red-950/20 border-red-900/30 opacity-75"
                          : "bg-red-50/70 border-red-200/90"
                        : isPass
                          ? theme === "dark"
                            ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                            : "bg-slate-100/60 border-slate-200/60"
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
                            ? "line-through text-slate-450 dark:text-slate-505 text-red-500/70"
                            : isPass
                              ? "text-slate-500 italic font-medium"
                              : "text-slate-800 dark:text-slate-100"
                        }`}>
                          {h.word}
                        </span>
                        {h.coordinates && h.coordinates !== "-" && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {h.coordinates} par {h.playerName}
                          </span>
                        )}
                        {isPass && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            Par {h.playerName}
                          </span>
                        )}
                        {h.bonusPoints && h.bonusPoints > 0 && (
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded tracking-wide inline-flex items-center gap-1 mt-1 shrink-0 self-start animate-pulse">
                            ★ Avec un Bonus de Contestation : +{h.bonusPoints} pts ! ⚡
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-xs font-mono shrink-0 ${
                        h.isContested
                          ? "text-red-500"
                          : isPass
                            ? "text-slate-500"
                            : "text-amber-500"
                      }`}>
                        {h.score} pts
                      </span>

                      <div className="flex items-center gap-1 border-l border-slate-500/10 pl-2">
                        {/* Contest word button - Only shown if active word and not already contested or pass */}
                        {!h.isContested && !isPass && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Voulez-vous marquer le mot '${h.word}' comme faux et contesté ? Les points seront annulés et les lettres retirées du plateau.`)) {
                                contestHistoryEntry(h.id);
                              }
                            }}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer"
                            title="Faux mot contesté (0 point & retrait du plateau)"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(h)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer"
                          title="Modifier ce coup en cas d'erreur de saisie"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryEntry(h.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Supprimer ce coup"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
