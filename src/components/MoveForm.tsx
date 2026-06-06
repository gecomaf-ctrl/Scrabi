import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMatch } from "../context/MatchContext";
import { calculateScore } from "../logic/scrabbleEngine";

interface MoveFormProps {
  word: string;
  setWord: (val: string) => void;
  coords: string;
  setCoords: (val: string) => void;
  direction: "H" | "V";
  setDirection: (val: "H" | "V") => void;
  adjustment: number;
  setAdjustment: (val: number) => void;
}

export default function MoveForm({
  word,
  setWord,
  coords,
  setCoords,
  direction,
  setDirection,
  adjustment,
  setAdjustment,
}: MoveFormProps) {
  const { theme } = useTheme();
  const { players, activePlayerIndex, submitWord, board } = useMatch();

  // Auto-calculated suggestion
  const [autoScore, setAutoScore] = useState<{ total: number; breakdown: string } | null>(null);

  // Recalculate automatic score suggestions based on Scrabble rules
  useEffect(() => {
    const cleanWord = word.trim(); // Keep case for jokers (lowercase)!
    const cleanCoords = coords.trim().toUpperCase();
    if (cleanWord && cleanCoords && cleanCoords.length >= 2) {
      const fullCoords = `${cleanCoords}${direction}`;
      try {
        const result = calculateScore(cleanWord, fullCoords, board);
        if (result && result.total > 0) {
          setAutoScore({ total: result.total, breakdown: result.breakdown });
        } else {
          setAutoScore(null);
        }
      } catch (e) {
        setAutoScore(null);
      }
    } else {
      setAutoScore(null);
    }
  }, [word, coords, direction, board]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim(); // Keep case for jokers (lowercase)!
    const cleanCoords = coords.trim().toUpperCase();
    
    const baseScore = autoScore ? autoScore.total : 0;
    const finalScore = baseScore + adjustment;
    
    let breakdownVal = "";
    if (autoScore) {
      breakdownVal = adjustment !== 0
        ? `${autoScore.breakdown} (Ajustement: ${adjustment > 0 ? "+" : ""}${adjustment})`
        : autoScore.breakdown;
    } else if (adjustment !== 0) {
      breakdownVal = `Ajustement arbitre: ${adjustment > 0 ? "+" : ""}${adjustment}`;
    }

    if (!cleanWord) return;
    if (!cleanCoords) return;

    // Call Context to append move for currently active player
    submitWord(activePlayerIndex, cleanWord, finalScore, `${cleanCoords}${direction}`, breakdownVal);
    
    // Reset inputs
    setWord("");
    setCoords("");
    setAdjustment(0);
    setAutoScore(null);
  };

  // Helper to count played & remaining tiles
  const getPlayedCount = () => {
    let count = 0;
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c]) {
          count++;
        }
      }
    }
    return count;
  };

  const playedCount = getPlayedCount();
  const remainingCount = Math.max(0, 102 - playedCount);
  // Final summed preview
  const finalCalculatedScore = (autoScore ? autoScore.total : 0) + adjustment;
  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${
      theme === "dark" 
        ? "bg-slate-900/80 border-slate-800 text-slate-100" 
        : "bg-white border-slate-200 text-slate-800 shadow-sm"
    }`}>
      <div className="space-y-4">
        {/* Adjustment score option */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Ajustement :
            </label>
            <span className={`text-[10px] font-mono font-bold ${adjustment > 0 ? "text-emerald-500" : adjustment < 0 ? "text-rose-500" : "text-slate-500"}`}>
              {adjustment > 0 ? `+${adjustment}` : adjustment} PTS
            </span>
          </div>
          <input
            type="number"
            value={adjustment === 0 ? "" : adjustment}
            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
            placeholder="+0"
            className={`w-full p-2.5 rounded-xl border text-center text-xs font-mono font-semibold focus:outline-none focus:ring-1.5 focus:ring-amber-500/40 ${
              theme === "dark"
                ? "bg-slate-955 border-slate-855 text-white placeholder-slate-700"
                : "bg-slate-105 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
